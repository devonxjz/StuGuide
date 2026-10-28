import { readFileSync } from "node:fs";
import { evalCaseListSchema, type EvalCase } from "./case.schema";

/** Đọc và kiểm tra bộ case; file sai hình dạng thì dừng ngay với thông báo rõ. */
export function loadCases(path: string): EvalCase[] {
  const parsed = evalCaseListSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) throw new Error(`Bộ case không hợp lệ (${path}): ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  return parsed.data;
}

/** Mẫu nhỏ tất định: lấy đều theo khoảng cách để vẫn bao phủ nhiều độ tuổi/chủ đề, cùng kết quả mỗi lần chạy. */
export function pickSample<T>(items: T[], size: number): T[] {
  if (!Number.isInteger(size) || size < 1) throw new Error("Cỡ mẫu phải là số nguyên dương");
  if (size >= items.length) return items;
  return Array.from({ length: size }, (_, i) => items[Math.floor((i * items.length) / size)]);
}
