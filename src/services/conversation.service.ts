import type { BaseMessage } from "@langchain/core/messages";
import { buildHistoryWindow, type StoredMessage } from "@/ai/memory/context-builder";
import { sanitizeDeep } from "@/core/guardrails/language-guard";
import { PermissionError } from "@/core/guardrails";
import { NotFoundError } from "@/core/errors";
import type { Repositories } from "@/data/repositories";
import type { StuGuideMessage } from "@/types/chat";
import type { Actor } from "./types";

export const MAX_MEMORIES = 30;
const MAX_MEMORY_LENGTH = 300;
const TITLE_LENGTH = 48;

export interface SummarizeFn {
  (args: { previousSummary: string; messages: StoredMessage[] }): Promise<string>;
}

export interface TurnContext {
  conversation: { id: string; title: string; summary: string; focusPlanId: string | null };
  /** Lịch sử đã cắt theo ngân sách token, tin của cô ở cuối */
  history: BaseMessage[];
  /** Bản tóm tắt cuộn của phần hội thoại cũ */
  summary: string;
  /** Trí nhớ dài hạn của cô */
  memories: string[];
}

const normalize = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();
const textOf = (m: StuGuideMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();

/** Hội thoại + trí nhớ: lưu bền vững, kiểm tra quyền sở hữu, quản lý ngữ cảnh và tóm tắt cuộn. */
export function createConversationService({ repos, summarize }: { repos: Repositories; summarize: SummarizeFn }) {
  const owned = async (actor: Actor, id: string) => {
    const conv = await repos.conversations.find(id);
    if (!conv) throw new NotFoundError("cuộc trò chuyện");
    if (conv.userId !== actor.id) throw new PermissionError("Bạn không có quyền với cuộc trò chuyện này");
    return conv;
  };

  const memories = async (actor: Actor) => repos.memories.list(actor.id);

  return {
    memories,

    list: (actor: Actor) => repos.conversations.list(actor.id),

    async load(actor: Actor, id: string) {
      const conversation = await owned(actor, id);
      const messages = await repos.conversations.messages(id);
      return { conversation, messages };
    },

    async remove(actor: Actor, id: string) {
      await owned(actor, id);
      await repos.conversations.remove(id);
    },

    setFocus: (id: string, planId: string | null) => repos.conversations.setFocus(id, planId),

    /** Bắt đầu một lượt: tạo cuộc trò chuyện nếu mới, lưu tin của cô, dựng ngữ cảnh cho LLM. */
    async beginTurn(actor: Actor, conversationId: string, userMessage: StuGuideMessage): Promise<TurnContext> {
      let conv = await repos.conversations.find(conversationId);
      if (conv && conv.userId !== actor.id) throw new PermissionError("Bạn không có quyền với cuộc trò chuyện này");
      if (!conv) {
        const title = normalize(textOf(userMessage)).slice(0, TITLE_LENGTH) || undefined;
        conv = await repos.conversations.create(conversationId, actor.id, title);
      }
      await repos.conversations.append(conversationId, { id: userMessage.id, role: "user", parts: userMessage.parts });

      const stored = await repos.conversations.messages(conversationId);
      const { window } = buildHistoryWindow(stored, conv.summaryUpTo);
      return {
        conversation: { id: conv.id, title: conv.title, summary: conv.summary, focusPlanId: conv.focusPlanId },
        history: window,
        summary: conv.summary,
        memories: (await memories(actor)).map((m) => m.content),
      };
    },

    /** Lưu câu trả lời của trợ lý (kèm các thẻ kết quả). */
    async finishTurn(conversationId: string, assistantMessage: StuGuideMessage) {
      // thông báo lỗi tạm thời (ERR-NET-01) không phải là nội dung hội thoại
      const parts = assistantMessage.parts.filter((p) => p.type !== "data-notice");
      if (parts.length === 0) return;
      await repos.conversations.append(conversationId, { id: assistantMessage.id, role: "assistant", parts });
    },

    /** Gộp phần hội thoại cũ vào bản tóm tắt cuộn khi vượt ngưỡng. Trả về true nếu đã tóm tắt. */
    async summarizeIfNeeded(conversationId: string): Promise<boolean> {
      const conv = await repos.conversations.find(conversationId);
      if (!conv) return false;
      const { overflow } = buildHistoryWindow(await repos.conversations.messages(conversationId), conv.summaryUpTo);
      if (overflow.length === 0) return false;
      const summary = sanitizeDeep(await summarize({ previousSummary: conv.summary, messages: overflow })).value;
      await repos.conversations.setSummary(conversationId, summary, Math.max(...overflow.map((m) => m.seq)));
      return true;
    },

    /** Ghi nhớ dài hạn (loại trùng, làm sạch từ dán nhãn trẻ, giới hạn số lượng và độ dài). */
    async remember(actor: Actor, raw: string) {
      const content = sanitizeDeep(normalize(raw).slice(0, MAX_MEMORY_LENGTH)).value;
      if (!content) throw new Error("Nội dung ghi nhớ trống");
      const existing = await repos.memories.list(actor.id);
      const dup = existing.find((m) => normalize(m.content).toLowerCase() === content.toLowerCase());
      if (dup) return dup;
      const created = await repos.memories.add(actor.id, content);
      const overflow = existing.length + 1 - MAX_MEMORIES;
      for (const old of existing.slice(0, Math.max(0, overflow))) await repos.memories.remove(old.id);
      return created;
    },

    async forget(actor: Actor, id: string) {
      const m = await repos.memories.find(id);
      if (!m) throw new NotFoundError("mục ghi nhớ");
      if (m.userId !== actor.id) throw new PermissionError();
      await repos.memories.remove(id);
    },
  };
}
export type ConversationService = ReturnType<typeof createConversationService>;
