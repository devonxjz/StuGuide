import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { resolveAiConfig, type AiConfig } from "./config";
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
  /** Trần output tokens của một lần gọi: chặn lần sinh lỗi trả văn bản quá dài (tốn tiền, tràn UI) */
  maxTokens: number;
}

/** Cảnh báo khi một lần gọi dùng từ ngần này trần trở lên (sắp bị cắt) */
export const WARN_AT_FRACTION_OF_MAX = 0.8;

/** Bảng định tuyến theo spec mục 6.1 (model cụ thể đọc từ biến môi trường). */
const TASK_PARAMS: Record<TaskType, TaskParams> = {
  "creative-generation": { temperature: 0.9, tier: "pro", maxTokens: 4000 },
  rewrite: { temperature: 0.75, tier: "pro", maxTokens: 3000 },
  analysis: { temperature: 0.25, tier: "pro", maxTokens: 1500 },
  extraction: { temperature: 0.2, tier: "fast", maxTokens: 800 },
  summarization: { temperature: 0.35, tier: "fast", maxTokens: 1000 },
  chat: { temperature: 0.7, tier: "pro", maxTokens: 1500 },
  summarization_memory: { temperature: 0.2, tier: "fast", maxTokens: 800 },
  personalization: { temperature: 0.8, tier: "pro", maxTokens: 2500 },
  evaluation: { temperature: 0, tier: "fast", maxTokens: 800 },
};

export const getTaskParams = (task: TaskType): TaskParams => TASK_PARAMS[task];

export function routeModel(task: TaskType, config: AiConfig = resolveAiConfig()): BaseChatModel {
  const { temperature, tier, maxTokens } = TASK_PARAMS[task];
  const model = tier === "pro" ? config.chatModel : config.fastModel;
  return new ChatOpenAI({
    model,
    apiKey: config.apiKey,
    temperature,
    maxTokens,
    maxRetries: 2,
    callbacks: [new UsageLogger({ task, model, warnOutputTokens: Math.floor(maxTokens * WARN_AT_FRACTION_OF_MAX) })],
  });
}
