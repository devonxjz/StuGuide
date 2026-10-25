import { getPrisma } from "@/data/prisma";
import { createRepositories } from "@/data/repositories";
import { seedDemoData } from "@/data/seed/demo-data";
import { createServices } from "@/services";
import { createConversationService } from "@/services/conversation.service";
import { createFamilyServices } from "@/services/family";
import { createChildDistiller } from "@/ai/memory/child-distiller";
import { createChatAgentService } from "@/services/chat/chat-agent.service";
import { createAiEngine } from "@/ai/engine";
import { routeModel } from "@/ai/model-router";
import { createSummarizer } from "@/ai/memory/summarizer";
import { getKnowledgeRetriever } from "@/ai/rag/retriever";
import { getFeedbackBus } from "./event-bus";

function build() {
  const prisma = getPrisma();
  const repos = createRepositories(prisma);
  const retriever = getKnowledgeRetriever();
  const events = getFeedbackBus();

  const engine = createAiEngine();
  const services = createServices({ repos, engine, events });
  const conversations = createConversationService({ repos, summarize: createSummarizer(() => routeModel("summarization_memory")) });

  const family = createFamilyServices({
    repos,
    engine,
    audit: services.audit,
    distiller: createChildDistiller(() => routeModel("summarization_memory")),
    getModel: () => routeModel("chat"),
  });

  return {
    prisma,
    repos,
    services,
    events,
    conversations,
    family,
    chat: createChatAgentService({ services, repos, retriever, conversations, profiles: family.profiles, getModel: () => routeModel("chat") }),
  };
}

export type Container = ReturnType<typeof build>;
const g = globalThis as unknown as { __sgContainer?: Promise<Container> };

/**
 * Composition root của toàn app. Môi trường phát triển: lần đầu chạy sẽ nạp dữ liệu demo nếu DB còn trống.
 * Production KHÔNG BAO GIỜ tự nạp (tài khoản demo dùng chung một mật khẩu đã biết).
 */
export function getContainer(): Promise<Container> {
  return (g.__sgContainer ??= (async () => {
    const c = build();
    try {
      if ((await c.prisma.user.count()) === 0) await seedDemoData(c.prisma);
    } catch (error) {
      g.__sgContainer = undefined;
      throw new Error(`Chưa khởi tạo cơ sở dữ liệu. Hãy chạy "npm run setup" trước. (${(error as Error).message})`);
    }
    return c;
  })());
}

/** Dùng trong test để thay container bằng DB riêng. */
export function setContainerForTests(container: Container | undefined) {
  g.__sgContainer = container ? Promise.resolve(container) : undefined;
}
export { build as buildContainer };
