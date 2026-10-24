import { createUIMessageStream } from "ai";
import type { UIMessageChunk } from "ai";
import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createStuGuideAgent } from "@/ai/agent/create-agent";
import { pipeAgentToUi } from "@/ai/stream/agent-to-ui";
import { buildFamilyAgentPrompt } from "@/ai/prompts/family-agent.prompt";
import { estimateTokens, HISTORY_TOKEN_BUDGET } from "@/ai/memory/context-builder";
import type { AiEngine } from "@/ai/engine";
import { FlowError, isAppError, isZodError } from "@/core/errors";
import { PermissionError } from "@/core/guardrails";
import { sanitizeDeep } from "@/core/guardrails/language-guard";
import type { Repositories } from "@/data/repositories";
import type { CardData, StuGuideMessage } from "@/types/chat";
import type { Actor } from "../types";
import type { ChildProfileService } from "./child-profile.service";

export interface FamilyTurn {
  role: "parent" | "assistant";
  text: string;
}

export const ERR_NET_MESSAGE = "Hệ thống AI đang bận, bố mẹ thử gửi lại giúp mình nhé.";
type Result = [string, CardData];
const notice = (message: string): Result => [message, { kind: "notice", tone: "warning", message }];

/** Cửa sổ hội thoại do client giữ trong RAM: lấy tin mới nhất trong ngân sách token. */
export function turnsToMessages(turns: FamilyTurn[]): BaseMessage[] {
  const picked: FamilyTurn[] = [];
  let used = 0;
  for (const t of [...turns].reverse()) {
    const cost = estimateTokens(t.text);
    if (picked.length > 0 && used + cost > HISTORY_TOKEN_BUDGET) break;
    picked.unshift(t);
    used += cost;
  }
  return picked.map((t) => (t.role === "parent" ? new HumanMessage(t.text) : new AIMessage(t.text)));
}

/** Trợ lý gia đình (LangChain agent). Hội thoại ngắn hạn do client giữ trong RAM, server không lưu từng lượt. */
export function createFamilyAssistantService({
  repos,
  profiles,
  engine,
  getModel,
}: {
  repos: Repositories;
  profiles: ChildProfileService;
  engine: AiEngine;
  getModel: () => BaseChatModel;
}) {
  /**
   * Hoạt động ở nhà đi thẳng tới phụ huynh (không có bước duyệt của cô), nên còn vi phạm luật bắt buộc
   * (screen-free, an toàn theo tuổi, ngôn ngữ) sau các vòng AI tự sửa thì KHÔNG trả về.
   */
  const homeActivity = async (studentId: string, focus?: string, minutes?: number) => {
    const student = await repos.students.findById(studentId);
    const generated = await engine.generateHomeActivity({ profile: await profiles.profileForAI(studentId), focus, minutes, ageGroup: student?.class.ageGroup });
    if (!generated.review.passed) return null;
    return sanitizeDeep(generated.value).value;
  };

  const buildTools = (actor: Actor, studentId: string) => {
    const guarded = <A,>(fn: (a: A) => Promise<Result>) => async (a: A): Promise<Result> => {
      try {
        return await fn(a);
      } catch (e) {
        if (isAppError(e)) return notice(e.message);
        if (isZodError(e)) return notice("Thiếu hoặc sai thông tin, bố mẹ thử diễn đạt lại giúp mình nhé.");
        throw e;
      }
    };

    const suggest = tool(
      guarded(async (args: { focus?: string; minutes?: number }) => {
        const activity = await homeActivity(studentId, args.focus, args.minutes);
        if (!activity) return notice("Mình chưa soạn được hoạt động phù hợp (không dùng màn hình), bố mẹ nói rõ hơn đồ vật có sẵn giúp mình nhé.");
        return [`Đã gợi ý hoạt động "${activity.title}" (${activity.minutes} phút) cá nhân hóa cho bé: ${activity.whyForThisChild}`, { kind: "home-activity", studentId, activity }];
      }),
      {
        name: "suggest_home_activity",
        description: "Soạn MỘT hoạt động ngắn ở nhà cá nhân hóa cho đúng bé (dựa trên hồ sơ, sở thích đã nhớ, bài học ở lớp). Phụ huynh dẫn dắt, dùng đồ vật thật, không màn hình.",
        schema: z.object({ focus: z.string().max(300).optional().describe("Điều bố mẹ muốn tập trung hoặc đồ vật đang có trong nhà"), minutes: z.number().min(3).max(15).optional() }),
        responseFormat: "content_and_artifact",
      },
    );

    const progress = tool(
      guarded(async () => {
        const o = await profiles.overview(actor, studentId);
        return [
          o.progress.length ? `Tiến bộ theo mảng của ${o.student.fullName}: ${o.progress.map((p) => `${p.label} – ${p.level} (${p.total} lần ghi nhận)`).join("; ")}.` : "Chưa có đánh giá nào để tổng hợp.",
          { kind: "child-progress", progress: o.progress },
        ];
      }),
      { name: "get_child_progress", description: "Xem mức đạt của bé theo từng mảng phát triển (tích cực, không dán nhãn).", schema: z.object({}), responseFormat: "content_and_artifact" },
    );

    const lessons = tool(
      guarded(async () => {
        const o = await profiles.overview(actor, studentId);
        const items = o.recentLessons.map((l) => ({ planId: l.planId, gameName: l.gameName, areaLabel: l.areaLabel, date: l.date.toISOString(), summary: l.summary, missionTitle: l.missionTitle }));
        return [items.length ? `Bài học gần đây ở lớp: ${items.map((l) => `"${l.gameName}" (${l.areaLabel}) – ${l.summary}`).join(" | ")}` : "Lớp chưa chia sẻ bài học nào.", { kind: "child-lessons", lessons: items }];
      }),
      { name: "get_recent_lessons", description: "Xem các bài học và trò chơi gần đây bé đã học ở lớp.", schema: z.object({}), responseFormat: "content_and_artifact" },
    );

    const remember = tool(
      guarded(async (args: { content: string }) => {
        const m = await profiles.remember(actor, studentId, args.content, "parent");
        return [`Đã ghi nhớ về bé: "${m.content}".`, { kind: "notice", tone: "info", message: `Đã ghi nhớ về bé: ${m.content}` }];
      }),
      {
        name: "save_child_memory",
        description: "Ghi nhớ dài hạn một điều bền vững về bé (sở thích, nhân vật yêu thích, thói quen, hoạt động bé thích). Một câu ngắn, không chẩn đoán hay nhãn tâm lý.",
        schema: z.object({ content: z.string().min(3).max(200).describe("Một câu ngắn về bé, do chính bố mẹ kể") }),
        responseFormat: "content_and_artifact",
      },
    );
    return [suggest, progress, lessons, remember];
  };

  return {
    /** Kiểm tra quyền (BR-006) trước khi stream: phụ huynh chỉ trò chuyện về con mình. */
    async createUiStream({ actor, studentId, turns, signal }: { actor: Actor; studentId: string; turns: FamilyTurn[]; signal?: AbortSignal }): Promise<ReadableStream<UIMessageChunk>> {
      if (actor.role !== "parent") throw new PermissionError("Trợ lý gia đình dành cho phụ huynh");
      await profiles.assertAccess(actor, studentId);
      const parent = await repos.users.findById(actor.id);
      const profile = await profiles.profileForAI(studentId);

      return createUIMessageStream<StuGuideMessage>({
        onError: () => ERR_NET_MESSAGE,
        execute: async ({ writer }) => {
          const agent = createStuGuideAgent({
            model: getModel(),
            tools: buildTools(actor, studentId) as never,
            systemPrompt: buildFamilyAgentPrompt({ parentName: parent?.fullName ?? "", childProfile: profile }),
          });
          try {
            await pipeAgentToUi(await agent.stream(turnsToMessages(turns), signal), writer);
          } catch (error) {
            if (signal?.aborted) return;
            console.error("[family-assistant]", error);
            writer.write({ type: "data-notice", data: { code: "ERR-NET-01", message: ERR_NET_MESSAGE } });
          }
        },
      });
    },

    /** Gợi ý hoạt động tối nay bằng một chạm (không qua chat). */
    async suggestTonight(actor: Actor, studentId: string, focus?: string) {
      if (actor.role !== "parent") throw new PermissionError();
      await profiles.assertAccess(actor, studentId);
      const activity = await homeActivity(studentId, focus);
      if (!activity) throw new FlowError("Mình chưa soạn được hoạt động đạt tiêu chí an toàn, bố mẹ nói rõ hơn đồ vật có sẵn giúp mình nhé.");
      return activity;
    },
  };
}
export type FamilyAssistantService = ReturnType<typeof createFamilyAssistantService>;
