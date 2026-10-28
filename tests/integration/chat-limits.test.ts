import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { BaseChatModel, type BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import type { ChatResult } from "@langchain/core/outputs";
import type { UIMessageChunk } from "ai";
import { createTestContainer } from "../helpers/test-container";
import { createChatAgentService, ERR_NET_MESSAGE } from "@/services/chat/chat-agent.service";
import { createFamilyAssistantService, ERR_NET_MESSAGE as FAMILY_ERR_NET_MESSAGE } from "@/services/family/family-assistant.service";
import type { AiEngine } from "@/ai/engine";
import type { StuGuideMessage } from "@/types/chat";

type T = Awaited<ReturnType<typeof createTestContainer>>;
let t: T;

beforeAll(async () => {
  t = await createTestContainer();
});
afterAll(async () => t.container.prisma.$disconnect());

/** Model "treo": không bao giờ trả lời (giả lập nhà cung cấp AI không phản hồi). */
class HangingModel extends BaseChatModel {
  constructor(params: BaseChatModelParams = {}) {
    super(params);
  }
  _llmType() {
    return "hanging";
  }
  _generate(): Promise<ChatResult> {
    return new Promise(() => {});
  }
  bindTools() {
    return this;
  }
}

async function drain(stream: ReadableStream<UIMessageChunk>) {
  const reader = stream.getReader();
  const chunks: UIMessageChunk[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return chunks.filter((c) => c.type === "data-notice").map((c) => (c as unknown as { data: { code: string; message: string } }).data);
}

const SHORT_TIMEOUT = { maxToolCalls: 8, timeoutMs: 80 };

describe("timeout lượt chat (P1-09)", () => {
  it("chat giáo viên: model treo quá timeout thì lượt kết thúc với thông báo thân thiện, không treo request", async () => {
    const chat = createChatAgentService({
      services: t.container.services,
      repos: t.container.repos,
      retriever: { retrieve: async () => [] },
      conversations: t.container.conversations,
      profiles: t.container.family.profiles,
      getModel: () => new HangingModel(),
      limits: SHORT_TIMEOUT,
    });
    const message: StuGuideMessage = { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: "Soạn giúp mình" }] };
    const actor = { id: t.ids.teacherId, role: "teacher" as const, classId: t.ids.classId, schoolId: t.ids.schoolId };

    const started = Date.now();
    const notices = await drain(await chat.createUiStream({ conversationId: "conv-timeout", message, actor }));

    expect(Date.now() - started).toBeLessThan(5_000);
    expect(notices).toEqual([{ code: "ERR-NET-01", message: ERR_NET_MESSAGE }]);
  });

  it("chat gia đình: model treo quá timeout thì báo thân thiện, không treo", async () => {
    const assistant = createFamilyAssistantService({ repos: t.container.repos, profiles: t.container.family.profiles, engine: {} as AiEngine, getModel: () => new HangingModel(), limits: SHORT_TIMEOUT });
    const actor = { id: t.ids.huyParentId, role: "parent" as const };

    const started = Date.now();
    const notices = await drain(await assistant.createUiStream({ actor, studentId: t.ids.huyId, turns: [{ role: "parent", text: "Tối nay chơi gì?" }] }));

    expect(Date.now() - started).toBeLessThan(5_000);
    expect(notices).toEqual([{ code: "ERR-NET-01", message: FAMILY_ERR_NET_MESSAGE }]);
  });
});
