"use client";

import { useEffect } from "react";

/** BR-007: tự lưu nháp sau 500ms để không mất dữ liệu khi rớt mạng / tắt tab (ERR-DATA-01). */
export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function useAutoSave(key: string, value: unknown, { delay = 500, enabled = true }: { delay?: number; enabled?: boolean } = {}) {
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    }, delay);
    return () => clearTimeout(timer);
  }, [key, value, delay, enabled]);
}
