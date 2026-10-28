import { collectStrings } from "@/ai/quality/rubrics";
import type { Finding } from "@/ai/quality/rubric";
import type { LessonPlanOutput } from "@/core/schemas/lesson-plan.schema";
import type { EvalCase, Expectation } from "./case.schema";

export interface CaseScore {
  id: string;
  /** 0..1: tỉ lệ (tiêu chí rubric + kỳ vọng của case) đạt */
  score: number;
  /** Số tiêu chí BẮT BUỘC còn vi phạm sau vòng tự sửa */
  blockingFailures: number;
  /** Mô tả những gì chưa đạt (để đọc báo cáo) */
  failed: string[];
}

export interface RunSummary {
  overall: number;
  blockingFailures: number;
  cases: CaseScore[];
}

const normalize = (text: string) => text.normalize("NFC").toLowerCase();

function scopeText(plan: LessonPlanOutput, scope: Expectation["scope"]): string {
  if (scope === "safetyWarnings") return collectStrings(plan.safetyWarnings).join("\n");
  if (scope === "procedure") return collectStrings(plan.procedure).join("\n");
  return collectStrings(plan).join("\n");
}

/** Kỳ vọng có đạt không: mention cần ít nhất một từ khóa, avoid cần không có từ khóa nào. */
export function meetsExpectation(plan: LessonPlanOutput, expectation: Expectation): boolean {
  const text = normalize(scopeText(plan, expectation.scope));
  const found = expectation.anyOf.some((keyword) => text.includes(normalize(keyword)));
  return expectation.mode === "mention" ? found : !found;
}

/**
 * Chấm một case: kết hợp kết quả rubric hiện có (findings của vòng chất lượng) với kỳ vọng riêng của case.
 * Mỗi tiêu chí rubric chỉ bị trừ một lần dù có nhiều vấn đề.
 */
export function scoreCase(evalCase: EvalCase, plan: LessonPlanOutput, findings: Finding[], rubricCriteriaCount: number): CaseScore {
  const failedCriteria = new Map(findings.map((f) => [f.criterionId, f]));
  const failedExpectations = evalCase.expectations.filter((e) => !meetsExpectation(plan, e));

  const total = rubricCriteriaCount + evalCase.expectations.length;
  const passed = total - failedCriteria.size - failedExpectations.length;

  return {
    id: evalCase.id,
    score: Math.max(0, passed) / total,
    blockingFailures: [...failedCriteria.values()].filter((f) => f.severity === "blocking").length,
    failed: [...[...failedCriteria.values()].map((f) => `rubric:${f.criterionId}`), ...failedExpectations.map((e) => `expect:${e.id}`)],
  };
}

export function summarize(cases: CaseScore[]): RunSummary {
  const overall = cases.length ? cases.reduce((sum, c) => sum + c.score, 0) / cases.length : 0;
  return { overall, blockingFailures: cases.reduce((sum, c) => sum + c.blockingFailures, 0), cases };
}
