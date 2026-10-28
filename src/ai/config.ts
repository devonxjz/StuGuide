export interface AiConfig {
  apiKey: string;
  chatModel: string;
  fastModel: string;
  embeddingModel: string;
  /** Số vòng AI tự sửa tối đa theo tiêu chí đánh giá (0–3) */
  maxRevisions: number;
}

/**
 * Model được pin theo snapshot có ngày để hành vi không đổi ngầm khi nhà cung cấp cập nhật.
 * Nâng version là quyết định có chủ đích: đổi hằng số/biến môi trường, chạy `npm run eval` và so với baseline trước khi merge.
 */
export const DEFAULT_CHAT_MODEL = "gpt-4.1-2025-04-14";
export const DEFAULT_FAST_MODEL = "gpt-4.1-mini-2025-04-14";

const PINNED_MODEL = /-\d{4}-\d{2}-\d{2}$/;
/** Tên model có hậu tố ngày (snapshot) thì coi là đã pin. */
export const isPinnedModel = (model: string) => PINNED_MODEL.test(model);

/** Cấu hình AI thật. Không có OPENAI_API_KEY thì báo lỗi rõ ràng, không có chế độ giả lập. */
export function resolveAiConfig(env: Record<string, string | undefined> = process.env): AiConfig {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Thiếu OPENAI_API_KEY. Hãy đặt khóa API trong .env.local (xem .env.example).");
  }
  return {
    apiKey,
    chatModel: env.OPENAI_CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL,
    fastModel: env.OPENAI_FAST_MODEL?.trim() || DEFAULT_FAST_MODEL,
    embeddingModel: env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    maxRevisions: resolveMaxRevisions(env),
  };
}

/** Đọc riêng (không cần API key) để dựng engine khi khởi động mà không làm hỏng các trang không dùng AI. */
export function resolveMaxRevisions(env: Record<string, string | undefined> = process.env): number {
  const n = Number.parseInt(env.AI_MAX_REVISIONS ?? "2", 10);
  return Number.isFinite(n) ? Math.min(3, Math.max(0, n)) : 2;
}
