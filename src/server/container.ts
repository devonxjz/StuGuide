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
import { createSmtpMailer } from "./mail/smtp-mailer";

function build() {
  const prisma = getPrisma();
  const repos = createRepositories(prisma);
  const retriever = getKnowledgeRetriever();
  const events = getFeedbackBus();

  const engine = createAiEngine();
  const services = createServices({ repos, engine, events, mailer: createSmtpMailer() });
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

/**
 * Container được cache trên globalThis để dùng chung giữa các request. Khi dev, HMR nạp lại module này nên `build` đổi
 * danh tính: cache dựng bằng `build` cũ bị coi là lỗi thời và dựng lại, tránh việc thêm dịch vụ mới mà phải khởi động lại server.
 * `builder: null` là container do test đặt vào (luôn giữ).
 */
interface Cached {
  builder: typeof build | null;
  promise: Promise<Container>;
}
const g = globalThis as unknown as { __sgContainer?: Cached };

/**
 * Composition root của toàn app. Môi trường phát triển: lần đầu chạy sẽ nạp dữ liệu demo nếu DB còn trống.
 * Production KHÔNG BAO GIỜ tự nạp (tài khoản demo dùng chung một mật khẩu đã biết).
 */
export function getContainer(): Promise<Container> {
  const cached = g.__sgContainer;
  if (cached && "builder" in cached && (cached.builder === null || cached.builder === build)) return cached.promise;

  const promise = (async () => {
    const c = build();
    try {
      if ((await c.prisma.user.count()) === 0) await seedDemoData(c.prisma);
    } catch (error) {
      g.__sgContainer = undefined;
      throw new Error(`Chưa khởi tạo cơ sở dữ liệu. Hãy chạy "npm run setup" trước. (${(error as Error).message})`);
    }
    return c;
  })();
  g.__sgContainer = { builder: build, promise };
  return promise;
}

/** Dùng trong test để thay container bằng DB riêng. */
export function setContainerForTests(container: Container | undefined) {
  g.__sgContainer = container ? { builder: null, promise: Promise.resolve(container) } : undefined;
}
export { build as buildContainer };
