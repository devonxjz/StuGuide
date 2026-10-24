import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createTestDb } from "./test-db";
import { createFakeEngine } from "./fake-engine";
import { HashEmbeddings } from "./hash-embeddings";
import { createRepositories } from "@/data/repositories";
import { createServices } from "@/services";
import { createConversationService } from "@/services/conversation.service";
import { createFamilyServices } from "@/services/family";
import { createChatAgentService } from "@/services/chat/chat-agent.service";
import { createKnowledgeRetriever } from "@/ai/rag/retriever";
import { FeedbackBus } from "@/server/event-bus";
import { setContainerForTests, type Container } from "@/server/container";

/** Container cho test: DB SQLite thật, engine/embedding/chat model là test double có thể thay trong từng test. */
export async function createTestContainer() {
  const { prisma, ids } = await createTestDb();
  const repos = createRepositories(prisma);
  const retriever = createKnowledgeRetriever({ embeddings: new HashEmbeddings() });
  const events = new FeedbackBus();
  const services = createServices({ repos, engine: createFakeEngine(), events });
  const summaries: { previousSummary: string; count: number }[] = [];
  const conversations = createConversationService({
    repos,
    summarize: async ({ previousSummary, messages }) => {
      summaries.push({ previousSummary, count: messages.length });
      return `${previousSummary} | tóm tắt ${messages.length} tin`.trim();
    },
  });
  const model = { current: undefined as unknown as BaseChatModel };
  const family = createFamilyServices({
    repos,
    engine: createFakeEngine(),
    audit: services.audit,
    getModel: () => model.current,
    // Test double của bộ chắt lọc AI: rút ra sở thích từ lời phụ huynh (kèm một nhãn cấm để kiểm tra làm sạch)
    distiller: async ({ transcript }) => {
      const text = transcript.map((t) => t.text).join(" ");
      const facts: string[] = [];
      if (/khủng long/i.test(text)) facts.push("Bé mê khủng long", "Bé tăng động nhẹ");
      if (/bút sáp/i.test(text)) facts.push("Bé thích vẽ bằng bút sáp");
      return { summary: facts.length ? `Phụ huynh chia sẻ: ${facts[0]}` : "Phiên ngắn", facts };
    },
  });
  const chat = createChatAgentService({ services, repos, retriever, conversations, profiles: family.profiles, getModel: () => model.current });
  const container = { prisma, repos, services, events, conversations, family, chat } as Container;
  setContainerForTests(container);
  return { container, ids, setChatModel: (m: BaseChatModel) => void (model.current = m), summaries };
}
