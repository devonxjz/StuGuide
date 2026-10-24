/** BR-005: 100% Screen-Free cho trẻ. Quét hướng dẫn có yêu cầu trẻ dùng màn hình. */
const SCREEN_TERMS =
  /(youtube|video|clip|phim hoạt hình|tivi|ti vi|\btv\b|máy tính bảng|ipad|điện thoại|máy tính|màn hình|ứng dụng|app\b)/gi;
const NEGATION = /(không|tránh|cấm|hạn chế|thay vì)\s+(?:\S+\s+){0,3}$/i;

export interface ScreenFreeResult {
  passed: boolean;
  violations: string[];
}

export function checkScreenFree(text: string): ScreenFreeResult {
  const violations: string[] = [];
  for (const m of text.matchAll(SCREEN_TERMS)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 30), m.index);
    if (NEGATION.test(before)) continue;
    violations.push(`Hướng dẫn có thiết bị màn hình: "${m[0]}"`);
  }
  return { passed: violations.length === 0, violations: [...new Set(violations)] };
}
