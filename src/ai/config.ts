export interface AiConfig {
  apiKey: string;
  chatModel: string;
  fastModel: string;
  embeddingModel: string;
  /** Số vòng AI tự sửa tối đa theo tiêu chí đánh giá (0–3) */
  maxRevisions: number;
}

/** Cấu hình AI thật. Không có OPENAI_API_KEY thì báo lỗi rõ ràng, không có chế độ giả lập. */
export function resolveAiConfig(env: Record<string, string | undefined> = process.env): AiConfig {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Thiếu OPENAI_API_KEY. Hãy đặt khóa API trong .env.local (xem .env.example).");
  }
  return {
    apiKey,
    chatModel: env.OPENAI_CHAT_MODEL ?? "gpt-4.1",
    fastModel: env.OPENAI_FAST_MODEL ?? "gpt-4.1-mini",
    embeddingModel: env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    maxRevisions: resolveMaxRevisions(env),
  };
}

/** Đọc riêng (không cần API key) để dựng engine khi khởi động mà không làm hỏng các trang không dùng AI. */
export function resolveMaxRevisions(env: Record<string, string | undefined> = process.env): number {
  const n = Number.parseInt(env.AI_MAX_REVISIONS ?? "2", 10);
  return Number.isFinite(n) ? Math.min(3, Math.max(0, n)) : 2;
}
