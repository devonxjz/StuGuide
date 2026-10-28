import type { Finding, Review, Rubric } from "./rubric";

/** Bộ chấm định tính: trả về kết quả cho từng tiêu chí được hỏi. */
export type Judge = (args: {
  subject: string;
  criteria: { id: string; description: string }[];
  output: unknown;
  /** Bối cảnh để chấm (thông tin lớp, góp ý của cô, hồ sơ bé…) */
  context: string;
}) => Promise<{ id: string; passed: boolean; issue?: string }[]>;

export interface Evaluation {
  findings: Finding[];
  judged: boolean;
  /** true khi bộ chấm lỗi cả sau khi retry — khác với "không có tiêu chí judged". */
  judgeFailed: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Lỗi bộ chấm định tính không làm hỏng luồng, nhưng không được nuốt lặng (xem P1-01). */

/** Chấm một đầu ra: kiểm tra tất định trước, sau đó (nếu có) bộ chấm định tính. Lỗi của bộ chấm không làm hỏng luồng. */
export async function evaluate<T, C>(
  rubric: Rubric<T, C>,
  output: T,
  ctx: C,
  opts: { judge?: Judge; context?: string; /** Khoảng chờ trước lần retry bộ chấm (mặc định 100ms; test truyền 0). */ judgeRetryDelayMs?: number } = {},
): Promise<Evaluation> {
  const findings: Finding[] = [];
  for (const c of rubric.criteria) {
    if (!c.check) continue;
    const issues = c.check(output, ctx).filter(Boolean);
    if (issues.length) findings.push({ criterionId: c.id, rule: c.rule, severity: c.severity, issues });
  }

  const judgedCriteria = rubric.criteria.filter((c) => c.judged);
  let judged = judgedCriteria.length === 0;
  let judgeFailed = false;
  if (opts.judge && judgedCriteria.length) {
    const judgeArgs = {
      subject: rubric.subject,
      criteria: judgedCriteria.map((c) => ({ id: c.id, description: c.description })),
      output,
      context: opts.context ?? "",
    };
    try {
      const results = await opts.judge(judgeArgs);
      for (const c of judgedCriteria) {
        const r = results.find((x) => x.id === c.id);
        if (r && !r.passed) findings.push({ criterionId: c.id, rule: c.rule, severity: c.severity, issues: [r.issue?.trim() || "Chưa đạt tiêu chí"] });
      }
      judged = true;
    } catch (firstError) {
      // Lỗi thoáng qua (timeout, rate limit) được cứu bằng 1 lần retry trước khi báo.
      try {
        await sleep(opts.judgeRetryDelayMs ?? 100);
        const results = await opts.judge(judgeArgs);
        for (const c of judgedCriteria) {
          const r = results.find((x) => x.id === c.id);
          if (r && !r.passed) findings.push({ criterionId: c.id, rule: c.rule, severity: c.severity, issues: [r.issue?.trim() || "Chưa đạt tiêu chí"] });
        }
        judged = true;
      } catch (error) {
        console.error(`[quality:${rubric.name}] bộ chấm định tính lỗi sau 1 lần retry, chỉ dùng kiểm tra tất định`, firstError, error);
        judgeFailed = true;
        findings.push({
          criterionId: "judge-unavailable",
          severity: "advisory",
          issues: ["Bộ chấm AI tạm lỗi, các tiêu chí định tính chưa được kiểm tra — cô đọc kỹ trước khi duyệt."],
        });
      }
    }
  }
  return { findings, judged, judgeFailed };
}

/** Thứ hạng để chọn bản tốt nhất: vi phạm bắt buộc nặng hơn nhiều so với tiêu chí chất lượng. */
const cost = (findings: Finding[]) => findings.reduce((n, f) => n + (f.severity === "blocking" ? 100 : 1), 0);

export interface RefineArgs<T, C> {
  rubric: Rubric<T, C>;
  ctx: C;
  /** Sinh đầu ra; lần sửa nhận bản trước + các tiêu chí chưa đạt */
  generate: (revision?: { previous: T; findings: Finding[] }) => Promise<T>;
  judge?: Judge;
  /** Bối cảnh cho bộ chấm */
  judgeContext?: string;
  /** Số vòng sửa tối đa sau lần sinh đầu (mặc định 2) */
  maxRevisions?: number;
  /**
   * Fail-closed khi bộ chấm lỗi: đầu ra đi thẳng tới phụ huynh (hoạt động ở nhà)
   * thì `passed` vẫn false cho tới khi chấm lại thành công hoặc cô duyệt tay.
   */
  failClosedOnJudgeError?: boolean;
  /** Báo tiến trình cho UI: đang sinh, đang chấm, đang sửa */
  onPhase?: (phase: "generate" | "evaluate" | "revise") => void;
}

/**
 * Vòng chất lượng: sinh → chấm theo tiêu chí → AI tự sửa theo phản hồi, tới khi đạt hoặc hết số vòng.
 * Trả về bản tốt nhất đã thấy (ít vi phạm nhất; bằng nhau thì lấy bản mới hơn) kèm kết quả chấm.
 */
export async function generateWithRubric<T, C>({ rubric, ctx, generate, judge, judgeContext, maxRevisions = 2, failClosedOnJudgeError, onPhase }: RefineArgs<T, C>): Promise<{ value: T; review: Review }> {
  onPhase?.("generate");
  let output = await generate();
  onPhase?.("evaluate");
  let ev = await evaluate(rubric, output, ctx, { judge, context: judgeContext });
  let best = { output, ev };
  let rounds = 1;

  while (ev.findings.length > 0 && rounds <= maxRevisions) {
    onPhase?.("revise");
    output = await generate({ previous: output, findings: ev.findings });
    onPhase?.("evaluate");
    ev = await evaluate(rubric, output, ctx, { judge, context: judgeContext });
    rounds += 1;
    if (cost(ev.findings) <= cost(best.ev.findings)) best = { output, ev };
  }

  return {
    value: best.output,
    review: {
      passed: !best.ev.findings.some((f) => f.severity === "blocking") && !(failClosedOnJudgeError && best.ev.judgeFailed),
      findings: best.ev.findings,
      rounds,
      judged: best.ev.judged,
    },
  };
}
