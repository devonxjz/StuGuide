import { BaseChatModel, type BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import type { BaseMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import type { Runnable } from "@langchain/core/runnables";
import { RunnableLambda } from "@langchain/core/runnables";
import { AppError } from "@/core/errors";
import type { TaskType } from "./model-router";

export const AI_UNAVAILABLE_MESSAGE = "Dịch vụ AI tạm thời không khả dụng, cô thử lại sau ít phút nhé.";

/** ERR-AI-01: nhà cung cấp AI lỗi/hết quota và không có phương án thay thế chấp nhận được. */
export class AiUnavailableError extends AppError {
  constructor() {
    super("ERR-AI-01", AI_UNAVAILABLE_MESSAGE, 503);
  }
}

const OUTAGE_NETWORK_CODES = new Set(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"]);

/**
 * Lỗi phía nhà cung cấp (outage, quá tải, hết quota, model bị gỡ) — đổi model mới có thể cứu được.
 * Lỗi của chính ta (400, 401, hủy chủ động) KHÔNG nằm trong nhóm này: đổi model cũng không đỡ và sẽ che lỗi thật.
 */
export function isProviderOutage(error: unknown): boolean {
  if (typeof error !== "object" || error === null || (error as { name?: string }).name === "AbortError") return false;
  const { status, code, cause } = error as { status?: number; code?: string; cause?: unknown };
  if (typeof status === "number") return status === 404 || status === 408 || status === 429 || status >= 500;
  if (code === "insufficient_quota" || code === "model_not_found" || (typeof code === "string" && OUTAGE_NETWORK_CODES.has(code))) return true;
  return cause !== undefined && cause !== error && isProviderOutage(cause);
}

export interface FallbackEvent {
  event: "llm_fallback";
  task: TaskType;
  from: string;
  to: string;
  reason: string;
}

export interface ResilientModelParams extends BaseChatModelParams {
  task: TaskType;
  primary: BaseChatModel;
  /** Chỉ có với task chịu được model yếu hơn; thiếu thì lỗi nhà cung cấp trả AiUnavailableError, không hạ cấp lặng lẽ */
  fallback?: BaseChatModel;
  primaryName: string;
  fallbackName?: string;
  /** Biến đổi model trước khi gọi (bindTools…) — áp cho cả primary lẫn fallback */
  bind?: (model: BaseChatModel) => Runnable<BaseMessage[], BaseMessage>;
  onFallback?: (event: FallbackEvent) => void;
}

const logFallback = (event: FallbackEvent) => console.warn(JSON.stringify(event));

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 200);

/**
 * Bọc model chính: lỗi nhà cung cấp thì thử model dự phòng (nếu task cho phép và có ghi log), nếu không thì báo lỗi thân thiện.
 * Là BaseChatModel nên agent và withStructuredOutput dùng được như model thường.
 */
export class ResilientChatModel extends BaseChatModel {
  constructor(private readonly params: ResilientModelParams) {
    super(params);
  }

  /** Model chính / dự phòng (để kiểm tra cấu hình) */
  get primaryModel() {
    return this.params.primary;
  }

  get fallbackModel() {
    return this.params.fallback;
  }

  _llmType() {
    return "stuguide-resilient";
  }

  private callable(model: BaseChatModel) {
    return this.params.bind ? this.params.bind(model) : (model as unknown as Runnable<BaseMessage[], BaseMessage>);
  }

  /** Quyết định sau lỗi của model chính: ném lại, báo không khả dụng, hoặc trả model dự phòng (kèm log). */
  private fallbackFor(error: unknown): BaseChatModel {
    const { fallback, task, primaryName, fallbackName, onFallback = logFallback } = this.params;
    if (!isProviderOutage(error)) throw error;
    if (!fallback) throw new AiUnavailableError();
    onFallback({ event: "llm_fallback", task, from: primaryName, to: fallbackName ?? "fallback", reason: reasonOf(error) });
    return fallback;
  }

  /** Chạy trên model chính, rồi dự phòng khi lỗi nhà cung cấp. */
  private async attempt<T>(run: (model: BaseChatModel) => Promise<T>): Promise<T> {
    try {
      return await run(this.params.primary);
    } catch (error) {
      const fallback = this.fallbackFor(error);
      try {
        return await run(fallback);
      } catch (fallbackError) {
        throw isProviderOutage(fallbackError) ? new AiUnavailableError() : fallbackError;
      }
    }
  }

  async _generate(messages: BaseMessage[], options: this["ParsedCallOptions"]): Promise<ChatResult> {
    const message = await this.attempt((model) => this.callable(model).invoke(messages, options));
    return { generations: [{ text: typeof message.content === "string" ? message.content : "", message }] };
  }

  private async *streamFrom(model: BaseChatModel, messages: BaseMessage[], options: this["ParsedCallOptions"], onChunk: () => void): AsyncGenerator<ChatGenerationChunk> {
    for await (const chunk of await this.callable(model).stream(messages, options)) {
      onChunk();
      yield new ChatGenerationChunk({ text: typeof chunk.content === "string" ? chunk.content : "", message: chunk as never });
    }
  }

  /** Giữ stream từng token. Chỉ chuyển sang dự phòng khi lỗi xảy ra TRƯỚC token đầu tiên (đã phát token thì không thể rút lại). */
  async *_streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"]): AsyncGenerator<ChatGenerationChunk> {
    let started = false;
    const onChunk = () => void (started = true);
    try {
      yield* this.streamFrom(this.params.primary, messages, options, onChunk);
    } catch (error) {
      if (started) throw error;
      yield* this.streamFrom(this.fallbackFor(error), messages, options, onChunk);
    }
  }

  bindTools(tools: Parameters<NonNullable<BaseChatModel["bindTools"]>>[0], kwargs?: Parameters<NonNullable<BaseChatModel["bindTools"]>>[1]) {
    const bindOne = (model: BaseChatModel) => {
      if (!model.bindTools) throw new Error("Model không hỗ trợ gọi công cụ");
      return model.bindTools(tools, kwargs) as unknown as Runnable<BaseMessage[], BaseMessage>;
    };
    return new ResilientChatModel({ ...this.params, bind: bindOne });
  }

  /** Giữ nguyên cách OpenAI dựng structured output (không dùng bản mặc định của lớp cha), chỉ thêm lớp dự phòng bên ngoài. */
  withStructuredOutput(schema: never, config?: never) {
    const { primary, fallback } = this.params;
    const build = (model: BaseChatModel) => (model.withStructuredOutput as (s: unknown, c?: unknown) => Runnable)(schema, config);
    const primaryRunnable = build(primary);
    const fallbackRunnable = fallback ? build(fallback) : undefined;
    return RunnableLambda.from((input: unknown, runConfig) => this.attempt((model) => (model === primary ? primaryRunnable : (fallbackRunnable as Runnable)).invoke(input, runConfig))) as never;
  }
}
