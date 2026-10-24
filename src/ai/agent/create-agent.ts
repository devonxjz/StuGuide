import { createAgent } from "langchain";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { BaseMessage } from "@langchain/core/messages";

export interface StuGuideAgentParams {
  model: BaseChatModel;
  tools: StructuredToolInterface[];
  systemPrompt: string;
}

/** Agent tool-calling của LangChain/LangGraph; model quyết định khi nào gọi công cụ nào. */
export function createStuGuideAgent({ model, tools, systemPrompt }: StuGuideAgentParams) {
  const agent = createAgent({ model, tools, systemPrompt });
  return {
    /** Stream token + tiến trình công cụ (streamMode: messages + custom). */
    stream: (messages: BaseMessage[], signal?: AbortSignal) =>
      agent.stream({ messages }, { streamMode: ["messages", "custom"], signal }) as Promise<AsyncIterable<unknown>>,
  };
}
