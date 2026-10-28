import { ChatOpenAI } from "@langchain/openai";
import { isPinnedModel, resolveAiConfig, type AiConfig } from "./config";
import { ResilientChatModel } from "./resilient-model";
import { UsageLogger } from "./usage-logger";

export type TaskType =
  | "creative-generation" // Soạn giáo án, trò chơi → model mạnh, temp cao
  | "rewrite" //              Viết lại một phần
  | "analysis" //             Phân tích chuỗi hành vi
  | "extraction" //           Rút trích checklist
  | "summarization" //        Tóm tắt thẻ phụ huynh
  | "chat" //                 Chatbot điều phối (tool calling)
  | "summarization_memory" // Tóm tắt hội thoại cũ để quản lý ngữ cảnh
  | "personalization" //     Hoạt động ở nhà cá nhân hóa cho từng bé
  | "evaluation"; //         Bộ chấm độc lập theo tiêu chí (nhất quán → nhiệt độ 0)

export interface TaskParams {
  temperature: number;
  tier: "pro" | "fast";
  /**
   * Cho phép hạ xuống model nhanh khi model chính lỗi nhà cung cấp. Chỉ bật cho task chịu được chất lượng thấp hơn (chat);
   * soạn giáo án, viết lại, phân tích… thì báo lỗi rõ ràng thay vì lặng lẽ dùng model yếu hơn.
   */
  fallbackToFast: boolean;
  /** Trần output tokens của một lần gọi: chặn lần sinh lỗi trả văn bản quá dài (tốn tiền, tràn UI) */
  maxTokens: number;
}

/** Cảnh báo khi một lần gọi dùng từ ngần này trần trở lên (sắp bị cắt) */
export const WARN_AT_FRACTION_OF_MAX = 0.8;

/** Bảng định tuyến theo spec mục 6.1 (model cụ thể đọc từ biến môi trường). */
const TASK_PARAMS: Record<TaskType, TaskParams> = {
  "creative-generation": { temperature: 0.9, tier: "pro", fallbackToFast: false, maxTokens: 4000 },
  rewrite: { temperature: 0.75, tier: "pro", fallbackToFast: false, maxTokens: 3000 },
  analysis: { temperature: 0.25, tier: "pro", fallbackToFast: false, maxTokens: 1500 },
  extraction: { temperature: 0.2, tier: "fast", fallbackToFast: false, maxTokens: 800 },
  summarization: { temperature: 0.35, tier: "fast", fallbackToFast: false, maxTokens: 1000 },
  chat: { temperature: 0.7, tier: "pro", fallbackToFast: true, maxTokens: 1500 },
  summarization_memory: { temperature: 0.2, tier: "fast", fallbackToFast: false, maxTokens: 800 },
  personalization: { temperature: 0.8, tier: "pro", fallbackToFast: false, maxTokens: 2500 },
  evaluation: { temperature: 0, tier: "fast", fallbackToFast: false, maxTokens: 800 },
};

export const getTaskParams = (task: TaskType): TaskParams => TASK_PARAMS[task];

const warnedUnpinned = new Set<string>();

function createOpenAiModel(task: TaskType, model: string, config: AiConfig): ChatOpenAI {
  const { temperature, maxTokens } = TASK_PARAMS[task];
  if (!isPinnedModel(model) && !warnedUnpinned.has(model)) {
    warnedUnpinned.add(model);
    console.warn(`[ai-model] "${model}" chưa pin snapshot có ngày — hành vi có thể đổi ngầm (xem .env.example)`);
  }
  return new ChatOpenAI({
    model,
    apiKey: config.apiKey,
    temperature,
    maxTokens,
    maxRetries: 2,
    callbacks: [new UsageLogger({ task, model, warnOutputTokens: Math.floor(maxTokens * WARN_AT_FRACTION_OF_MAX) })],
  });
}

/** Model cho một task: model chính theo tầng, kèm dự phòng (nếu task cho phép) và báo lỗi thân thiện khi nhà cung cấp lỗi. */
export function routeModel(task: TaskType, config: AiConfig = resolveAiConfig()): ResilientChatModel {
  const { tier, fallbackToFast } = TASK_PARAMS[task];
  const primaryName = tier === "pro" ? config.chatModel : config.fastModel;
  const fallbackName = fallbackToFast && tier === "pro" && config.fastModel !== primaryName ? config.fastModel : undefined;
  return new ResilientChatModel({
    task,
    primaryName,
    fallbackName,
    primary: createOpenAiModel(task, primaryName, config),
    fallback: fallbackName ? createOpenAiModel(task, fallbackName, config) : undefined,
  });
}
