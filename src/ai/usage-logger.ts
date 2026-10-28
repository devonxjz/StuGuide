import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { LLMResult } from "@langchain/core/outputs";
import type { AIMessage } from "@langchain/core/messages";
import type { TaskType } from "./model-router";

/** Một lần gọi LLM đã hoàn tất (hoặc lỗi), đủ để xem chi phí theo tính năng/ngày. */
export interface LlmCallRecord {
  event: "llm_call";
  task: TaskType;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  /** "length" nghĩa là đầu ra bị cắt ở trần maxTokens */
  finishReason: string | null;
  status: "ok" | "error";
}

export type UsageSink = (record: LlmCallRecord) => void;

/** Mặc định: một dòng JSON mỗi lần gọi (dễ gom theo ngày/tính năng); cảnh báo khi gần chạm hoặc chạm trần. */
export const consoleUsageSink: UsageSink = (record) => (record.status === "error" ? console.warn : console.info)(JSON.stringify(record));

export interface UsageLoggerOptions {
  task: TaskType;
  model: string;
  /** Ngưỡng output tokens để cảnh báo (thường ~80% maxTokens) */
  warnOutputTokens: number;
  sink?: UsageSink;
  now?: () => number;
}

/** Callback LangChain gắn một lần ở routeModel: mọi lần gọi model đều được ghi lại, không cần sửa nơi gọi. */
export class UsageLogger extends BaseCallbackHandler {
  name = "stuguide-usage-logger";
  private readonly startedAt = new Map<string, number>();

  constructor(private readonly options: UsageLoggerOptions) {
    super();
  }

  private get now() {
    return this.options.now ?? Date.now;
  }

  private emit(runId: string, partial: Pick<LlmCallRecord, "inputTokens" | "outputTokens" | "finishReason" | "status">) {
    const start = this.startedAt.get(runId);
    this.startedAt.delete(runId);
    const { task, model, warnOutputTokens, sink = consoleUsageSink } = this.options;
    try {
      sink({ event: "llm_call", task, model, latencyMs: start === undefined ? 0 : this.now() - start, ...partial });
      const exceeded = (partial.outputTokens ?? 0) >= warnOutputTokens || partial.finishReason === "length";
      if (exceeded) console.warn(`[ai-usage] ${task}/${model} dùng ${partial.outputTokens ?? "?"} output tokens (ngưỡng ${warnOutputTokens}${partial.finishReason === "length" ? ", đã bị cắt ở trần" : ""})`);
    } catch (error) {
      // Quan sát không bao giờ được làm hỏng lần gọi model.
      console.error("[ai-usage] ghi log lỗi", error);
    }
  }

  handleChatModelStart(_llm: unknown, _messages: unknown, runId: string) {
    this.startedAt.set(runId, this.now());
  }

  handleLLMStart(_llm: unknown, _prompts: unknown, runId: string) {
    this.startedAt.set(runId, this.now());
  }

  handleLLMEnd(output: LLMResult, runId: string) {
    const message = output.generations[0]?.[0] && (output.generations[0][0] as { message?: AIMessage }).message;
    const usage = message?.usage_metadata;
    const finishReason = (message?.response_metadata?.finish_reason as string | undefined) ?? null;
    this.emit(runId, { inputTokens: usage?.input_tokens ?? null, outputTokens: usage?.output_tokens ?? null, finishReason, status: "ok" });
  }

  handleLLMError(_error: unknown, runId: string) {
    this.emit(runId, { inputTokens: null, outputTokens: null, finishReason: null, status: "error" });
  }
}
