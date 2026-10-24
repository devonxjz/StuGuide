import { createTestDb } from "./test-db";
import { createRepositories } from "@/data/repositories";
import { createServices } from "@/services";
import { createConversationService } from "@/services/conversation.service";
import { createChatAgentService } from "@/services/chat/chat-agent.service";
import { createAiEngine } from "@/ai/engine";
import { createFamilyServices } from "@/services/family";
import { createChildDistiller } from "@/ai/memory/child-distiller";
import { routeModel } from "@/ai/model-router";
import { createSummarizer } from "@/ai/memory/summarizer";
import { createKnowledgeRetriever } from "@/ai/rag/retriever";
import { FeedbackBus } from "@/server/event-bus";
import type { UIMessageChunk } from "ai";
import type { StuGuideMessage } from "@/types/chat";

/** Container dùng AI thật (OpenAI) + DB SQLite riêng cho test live. */
export async function createLiveContainer() {
  const { prisma, ids } = await createTestDb();
  const repos = createRepositories(prisma);
  const retriever = createKnowledgeRetriever();
  const services = createServices({ repos, engine: createAiEngine(), events: new FeedbackBus() });
  const conversations = createConversationService({ repos, summarize: createSummarizer(() => routeModel("summarization_memory")) });
  const engine = createAiEngine();
  const family = createFamilyServices({
    repos,
    engine,
    audit: services.audit,
    distiller: createChildDistiller(() => routeModel("summarization_memory")),
    getModel: () => routeModel("chat"),
  });
  const chat = createChatAgentService({ services, repos, retriever, conversations, profiles: family.profiles, getModel: () => routeModel("chat") });
  const actor = { id: ids.teacherId, role: "teacher" as const, classId: ids.classId };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- thẻ kết quả đa hình
  type AnyCard = { kind: string } & Record<string, any>;

  /** Gửi một tin nhắn và gom toàn bộ stream lại. */
  async function say(conversationId: string, text: string) {
    const message: StuGuideMessage = { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] };
    const reader = (await chat.createUiStream({ conversationId, message, actor })).getReader();
    const chunks: UIMessageChunk[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const data = (type: string) => chunks.filter((c) => c.type === type).map((c) => (c as unknown as { data: AnyCard }).data);
    const reply = chunks.filter((c) => c.type === "text-delta").map((c) => (c as { delta: string }).delta).join("");
    return { reply, cards: data("data-card"), notices: data("data-notice"), status: data("data-status") };
  }

  /** Phụ huynh nhắn với trợ lý gia đình (cửa sổ hội thoại do "trình duyệt" giữ). */
  async function sayFamily(parentId: string, studentId: string, turns: { role: "parent" | "assistant"; text: string }[]) {
    const reader = (await family.assistant.createUiStream({ actor: { id: parentId, role: "parent" }, studentId, turns })).getReader();
    const chunks: UIMessageChunk[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const data = (type: string) => chunks.filter((c) => c.type === type).map((c) => (c as unknown as { data: AnyCard }).data);
    return { reply: chunks.filter((c) => c.type === "text-delta").map((c) => (c as { delta: string }).delta).join(""), cards: data("data-card"), notices: data("data-notice") };
  }

  return { prisma, ids, repos, services, conversations, family, retriever, actor, say, sayFamily };
}
