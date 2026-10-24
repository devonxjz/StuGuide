import { createUIMessageStream } from "ai";
import type { UIMessageChunk } from "ai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createStuGuideAgent } from "@/ai/agent/create-agent";
import { pipeAgentToUi } from "@/ai/stream/agent-to-ui";
import { buildChatAgentPrompt } from "@/ai/prompts/chat-agent.prompt";
import { createKnowledgeTools } from "@/ai/tools";
import type { KnowledgeRetriever } from "@/ai/rag/retriever";
import type { Repositories } from "@/data/repositories";
import { getAgeLabel } from "@/core/constants/age-groups";
import type { StuGuideMessage } from "@/types/chat";
import type { Services } from "../index";
import type { Actor } from "../types";
import type { ConversationService } from "../conversation.service";
import type { ChildProfileService } from "../family/child-profile.service";
import { createActionTools } from "./action-tools";
import { createChatKnowledgeTools } from "./knowledge-tools";

export interface ChatAgentDeps {
  services: Services;
  repos: Repositories;
  retriever: KnowledgeRetriever;
  conversations: ConversationService;
  profiles: ChildProfileService;
  getModel: () => BaseChatModel;
}

export interface ChatRequest {
  /** id cuộc trò chuyện do client chọn (UUID) */
  conversationId: string;
  /** Tin nhắn mới của cô. Lịch sử do server giữ, client không gửi lại. */
  message: StuGuideMessage;
  actor: Actor;
  signal?: AbortSignal;
}

export const ERR_NET_MESSAGE = "Hệ thống AI đang bận, cô thử gửi lại giúp mình nhé.";

/** Chatbot điều phối của giáo viên: LangChain agent + công cụ nghiệp vụ + bộ nhớ hội thoại, stream sang AI SDK UI. */
export function createChatAgentService({ services, repos, retriever, conversations, profiles, getModel }: ChatAgentDeps) {
  return {
    /** Kiểm tra quyền và lưu tin của cô trước khi stream (lỗi quyền trả về HTTP 403 thay vì lỗi trong stream). */
    async createUiStream({ conversationId, message, actor, signal }: ChatRequest): Promise<ReadableStream<UIMessageChunk>> {
      const turn = await conversations.beginTurn(actor, conversationId, message);

      return createUIMessageStream<StuGuideMessage>({
        originalMessages: [message],
        onError: () => ERR_NET_MESSAGE,
        onFinish: async ({ responseMessage }) => {
          await conversations.finishTurn(conversationId, responseMessage as StuGuideMessage);
          // Tóm tắt cuộn chạy nền, không chặn phản hồi
          void conversations.summarizeIfNeeded(conversationId).catch((e) => console.error("[summarize]", e));
        },
        execute: async ({ writer }) => {
          const [teacher, cls, focusPlan, recent] = await Promise.all([
            repos.users.findById(actor.id),
            repos.users.findClass(actor.classId ?? ""),
            // giáo án đang làm việc cũng đi qua kiểm tra quyền (không tin focusPlanId đã lưu)
            turn.conversation.focusPlanId ? services.lessonPlanner.getForActor(turn.conversation.focusPlanId, actor).catch(() => null) : null,
            repos.lessonPlans.listByClass(actor.classId ?? "", 6),
          ]);

          const focus = { planId: focusPlan?.id };
          const tools = [
            ...createActionTools({ actor, services, repos, focus, profiles, turn: { tainted: false }, remember: async (c) => (await conversations.remember(actor, c)).content }),
            ...createChatKnowledgeTools(createKnowledgeTools(retriever)),
          ];
          const agent = createStuGuideAgent({
            model: getModel(),
            tools: tools as never,
            systemPrompt: buildChatAgentPrompt({
              teacherName: teacher?.fullName ?? "",
              className: cls?.name ?? "chưa được phân công lớp",
              ageLabel: cls ? getAgeLabel(cls.ageGroup) : "",
              focusPlan: focusPlan ? { id: focusPlan.id, gameName: focusPlan.gameName, status: focusPlan.status } : null,
              recentPlans: recent.map((p) => ({ id: p.id, gameName: p.gameName, topic: p.topic, developmentArea: p.developmentArea, status: p.status })),
              memories: turn.memories,
              summary: turn.summary,
            }),
          });

          try {
            await pipeAgentToUi(await agent.stream(turn.history, signal), writer);
            if (focus.planId && focus.planId !== turn.conversation.focusPlanId) await conversations.setFocus(conversationId, focus.planId);
          } catch (error) {
            if (signal?.aborted) return;
            console.error("[chat-agent]", error);
            // ERR-NET-01: báo UI để cô gửi lại
            writer.write({ type: "data-notice", data: { code: "ERR-NET-01", message: ERR_NET_MESSAGE } });
          }
        },
      });
    },
  };
}

export type ChatAgentService = ReturnType<typeof createChatAgentService>;
