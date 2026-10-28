import { createAgent } from "langchain";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { BaseMessage } from "@langchain/core/messages";
import { recursionLimitFor, toolCallGuard, type AgentLimits } from "./limits";

export interface StuGuideAgentParams {
  model: BaseChatModel;
  tools: StructuredToolInterface[];
  systemPrompt: string;
  limits: AgentLimits;
}

/** Lượt chat chạy quá thời gian cho phép (khác với việc người dùng tự hủy). */
export class AgentTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Lượt chat vượt quá ${timeoutMs}ms`);
    this.name = "AgentTimeoutError";
  }
}

/** Agent tool-calling của LangChain/LangGraph; model quyết định khi nào gọi công cụ nào, trong trần bước và thời gian. */
export function createStuGuideAgent({ model, tools, systemPrompt, limits }: StuGuideAgentParams) {
  const agent = createAgent({ model, tools, systemPrompt, middleware: [toolCallGuard(limits.maxToolCalls)] });
  return {
    /** Stream token + tiến trình công cụ (streamMode: messages + custom). */
    async stream(messages: BaseMessage[], signal?: AbortSignal): Promise<AsyncIterable<unknown>> {
      const timeout = AbortSignal.timeout(limits.timeoutMs);
      const asTimeout = (error: unknown) => (timeout.aborted && !signal?.aborted ? new AgentTimeoutError(limits.timeoutMs) : error);
      try {
        const stream = await agent.stream(
          { messages },
          { streamMode: ["messages", "custom"], signal: signal ? AbortSignal.any([signal, timeout]) : timeout, recursionLimit: recursionLimitFor(limits.maxToolCalls) },
        );
        return rethrowAs(asTimeout, stream as AsyncIterable<unknown>);
      } catch (error) {
        throw asTimeout(error);
      }
    },
  };
}

/** Đổi lỗi hủy do hết giờ thành AgentTimeoutError để tầng gọi báo thân thiện thay vì coi như người dùng hủy. */
async function* rethrowAs(convert: (error: unknown) => unknown, stream: AsyncIterable<unknown>) {
  try {
    yield* stream;
  } catch (error) {
    throw convert(error);
  }
}
