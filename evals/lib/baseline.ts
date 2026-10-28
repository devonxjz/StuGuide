import { z } from "zod";
import type { RunSummary } from "./scoring";

export const DEFAULT_THRESHOLD = 0.03;

export const baselineSchema = z.strictObject({
  /** Điểm và số vi phạm bắt buộc từng case, để so sánh công bằng khi chỉ chạy một mẫu nhỏ */
  cases: z.record(z.string(), z.strictObject({ score: z.number().min(0).max(1), blockingFailures: z.number().int().min(0) })),
});
export type Baseline = z.infer<typeof baselineSchema>;

export interface Comparison {
  passed: boolean;
  /** Điểm trung bình của run và của baseline TRÊN CÙNG các case */
  overall: number;
  baselineOverall: number;
  reasons: string[];
}

export const toBaseline = (summary: RunSummary): Baseline => ({
  cases: Object.fromEntries(summary.cases.map((c) => [c.id, { score: c.score, blockingFailures: c.blockingFailures }])),
});

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);

/**
 * So run với baseline trên đúng các case đã chạy (chạy mẫu nhỏ vẫn so được).
 * Fail khi điểm trung bình giảm quá ngưỡng, hoặc khi có thêm vi phạm bắt buộc.
 */
export function compareToBaseline(summary: RunSummary, baseline: Baseline, threshold = DEFAULT_THRESHOLD): Comparison {
  const known = summary.cases.filter((c) => c.id in baseline.cases);
  if (known.length === 0) return { passed: false, overall: summary.overall, baselineOverall: 0, reasons: ["Không case nào của run có trong baseline — cập nhật baseline trước"] };

  const overall = mean(known.map((c) => c.score));
  const baselineOverall = mean(known.map((c) => baseline.cases[c.id].score));
  const blocking = sum(known.map((c) => c.blockingFailures));
  const baselineBlocking = sum(known.map((c) => baseline.cases[c.id].blockingFailures));

  const reasons: string[] = [];
  if (baselineOverall - overall > threshold) reasons.push(`Điểm giảm ${(baselineOverall - overall).toFixed(3)} (> ngưỡng ${threshold}): ${baselineOverall.toFixed(3)} → ${overall.toFixed(3)}`);
  if (blocking > baselineBlocking) reasons.push(`Vi phạm bắt buộc tăng: ${baselineBlocking} → ${blocking}`);
  return { passed: reasons.length === 0, overall, baselineOverall, reasons };
}
