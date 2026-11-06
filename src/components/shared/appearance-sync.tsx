"use client";

import { useApplyAppearance } from "@/hooks/use-appearance";

/** Áp giao diện đã lưu của người dùng lên khu vực ứng dụng (không hiển thị gì). */
export function AppearanceSync() {
  useApplyAppearance();
  return null;
}
