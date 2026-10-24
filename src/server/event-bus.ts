import { EventEmitter } from "node:events";
import type { FeedbackEvents, FeedbackStats } from "@/services/types";

/**
 * Realtime phản hồi phụ huynh -> cô giáo trong cùng tiến trình (prototype).
 * Production: thay bằng Supabase Realtime / Postgres LISTEN-NOTIFY, giữ nguyên interface FeedbackEvents.
 */
export class FeedbackBus implements FeedbackEvents {
  private emitter = new EventEmitter().setMaxListeners(200);

  publishFeedback(cardId: string, stats: FeedbackStats) {
    this.emitter.emit(cardId, stats);
  }

  subscribe(cardId: string, listener: (stats: FeedbackStats) => void): () => void {
    this.emitter.on(cardId, listener);
    return () => void this.emitter.off(cardId, listener);
  }
}

const g = globalThis as unknown as { __sgBus?: FeedbackBus };
export const getFeedbackBus = () => (g.__sgBus ??= new FeedbackBus());
