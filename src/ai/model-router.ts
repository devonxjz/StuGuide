import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { resolveAiConfig, type AiConfig } from "./config";

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
}

/** Bảng định tuyến theo spec mục 6.1 (model cụ thể đọc từ biến môi trường). */
const TASK_PARAMS: Record<TaskType, TaskParams> = {
  "creative-generation": { temperature: 0.9, tier: "pro" },
  rewrite: { temperature: 0.75, tier: "pro" },
  analysis: { temperature: 0.25, tier: "pro" },
  extraction: { temperature: 0.2, tier: "fast" },
  summarization: { temperature: 0.35, tier: "fast" },
  chat: { temperature: 0.7, tier: "pro" },
  summarization_memory: { temperature: 0.2, tier: "fast" },
  personalization: { temperature: 0.8, tier: "pro" },
  evaluation: { temperature: 0, tier: "fast" },
};

export const getTaskParams = (task: TaskType): TaskParams => TASK_PARAMS[task];

export function routeModel(task: TaskType, config: AiConfig = resolveAiConfig()): BaseChatModel {
  const { temperature, tier } = TASK_PARAMS[task];
  return new ChatOpenAI({
    model: tier === "pro" ? config.chatModel : config.fastModel,
    apiKey: config.apiKey,
    temperature,
    maxRetries: 2,
  });
}
