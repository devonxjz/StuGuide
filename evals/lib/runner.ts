import type { AiEngine } from "@/ai/engine";
import { lessonPlanRubric } from "@/ai/quality/rubrics";
import type { EvalCase } from "./case.schema";
import { scoreCase, type CaseScore } from "./scoring";

export type CaseResult = { ok: true; score: CaseScore } | { ok: false; id: string; error: string };

const JUDGE_UNAVAILABLE = "judge-unavailable";
const NO_CONTEXT = { teacherMemories: [], recentPlans: [] };

/**
 * Chạy một case qua engine thật. Lỗi hạ tầng (API lỗi, bộ chấm không chạy) KHÔNG được tính là điểm thấp,
 * vì sẽ làm baseline và so sánh sai lệch — trả về lỗi riêng để run báo hỏng.
 */
export async function runEvalCase(engine: AiEngine, evalCase: EvalCase): Promise<CaseResult> {
  try {
    const { value, review } = await engine.generateLessonPlan(evalCase.input, NO_CONTEXT);
    if (review.findings.some((f) => f.criterionId === JUDGE_UNAVAILABLE)) return { ok: false, id: evalCase.id, error: "Bộ chấm AI không chạy được" };
    return { ok: true, score: scoreCase(evalCase, value, review.findings, lessonPlanRubric.criteria.length) };
  } catch (error) {
    return { ok: false, id: evalCase.id, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Chạy theo lô nhỏ để không vượt giới hạn tốc độ của API. */
export async function runAll(engine: AiEngine, cases: EvalCase[], concurrency = 3): Promise<CaseResult[]> {
  const results: CaseResult[] = [];
  for (let i = 0; i < cases.length; i += concurrency) {
    results.push(...(await Promise.all(cases.slice(i, i + concurrency).map((c) => runEvalCase(engine, c)))));
  }
  return results;
}
