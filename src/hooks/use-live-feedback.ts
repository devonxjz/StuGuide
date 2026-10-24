"use client";

import { useEffect, useState } from "react";
import type { FeedbackStats } from "@/services/types";

/**
 * Nhận số liệu phản hồi phụ huynh realtime qua SSE (không cần F5).
 * Production có thể thay bằng Supabase Realtime mà giữ nguyên chữ ký hook.
 */
export function useLiveFeedback(cardId: string, initial: FeedbackStats) {
  const [stats, setStats] = useState(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const source = new EventSource(`/api/cards/${cardId}/stream`);
    source.onopen = () => setLive(true);
    source.onmessage = (e) => setStats(JSON.parse(e.data) as FeedbackStats);
    source.onerror = () => setLive(false);
    return () => source.close();
  }, [cardId]);

  return { stats, live };
}
