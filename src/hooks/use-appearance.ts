"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  APPEARANCE_EVENT,
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  applyAppearance,
  clearAppearance,
  parseAppearance,
  type Appearance,
} from "@/lib/appearance";

const subscribe = (notify: () => void) => {
  window.addEventListener(APPEARANCE_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(APPEARANCE_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
};

// useSyncExternalStore cần snapshot ổn định: chỉ tạo object mới khi chuỗi lưu đổi
let cachedRaw: string | null | undefined;
let cachedValue: Appearance = DEFAULT_APPEARANCE;
const getSnapshot = () => {
  const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseAppearance(raw);
  }
  return cachedValue;
};
const getServerSnapshot = () => DEFAULT_APPEARANCE;

/** Giao diện hiện tại + hàm đổi; mọi thay đổi áp ngay lên <html> và nhớ cho lần sau. */
export function useAppearance() {
  const appearance = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback((patch: Partial<Appearance>) => {
    const next = { ...getSnapshot(), ...patch };
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(APPEARANCE_EVENT));
  }, []);

  return { appearance, update };
}

/**
 * Đặt trong khu vực ứng dụng: áp giao diện đã lưu (kể cả khi vào từ trang đăng nhập bằng điều hướng phía client),
 * theo dõi chế độ "theo hệ thống", và gỡ ra khi rời khỏi ứng dụng để landing/đăng nhập giữ giao diện gốc.
 */
export function useApplyAppearance() {
  const { appearance } = useAppearance();

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyAppearance(appearance, root, media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [appearance]);

  useEffect(() => () => clearAppearance(document.documentElement), []);
}
