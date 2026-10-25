import { describe, it, expect, vi } from "vitest";
import { evaluate, generateWithRubric, type Judge } from "@/ai/quality/refine";
import type { Rubric } from "@/ai/quality/rubric";

type Out = { text: string };
const rubric: Rubric<Out, { banned: string }> = {
  name: "test",
  subject: "một đoạn văn",
  criteria: [
    { id: "khong-tu-cam", severity: "blocking", description: "Không chứa từ cấm", check: (o, ctx) => (o.text.includes(ctx.banned) ? [`Có từ "${ctx.banned}"`] : []) },
    { id: "am-ap", severity: "advisory", judged: true, description: "Ấm áp" },
  ],
};
const ctx = { banned: "xấu" };
const passJudge: Judge = async ({ criteria }) => criteria.map((c) => ({ id: c.id, passed: true }));

describe("evaluate: bộ chấm lỗi được retry và báo rõ (P1-01)", () => {
  it("lỗi 1 lần rồi thành công → retry cứu được, judged=true, không có judge-unavailable", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let calls = 0;
    const judge: Judge = async ({ criteria }) => {
      calls += 1;
      if (calls === 1) throw new Error("rate limit");
      return criteria.map((c) => ({ id: c.id, passed: true }));
    };
    const r = await evaluate(rubric, { text: "rất hay" }, ctx, { judge, judgeRetryDelayMs: 0 });
    expect(calls).toBe(2);
    expect(r.judged).toBe(true);
    expect(r.judgeFailed).toBe(false);
    expect(r.findings).toEqual([]);
    spy.mockRestore();
  });
});

describe("generateWithRubric: fail-closed khi bộ chấm lỗi (P1-01)", () => {
  const failingJudge: Judge = async () => Promise.reject(new Error("timeout"));
  const generate = async () => ({ text: "một đoạn tốt" });

  it("failClosedOnJudgeError=true → passed=false dù không còn vi phạm blocking", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await generateWithRubric({ rubric, ctx, generate, judge: failingJudge, maxRevisions: 0, failClosedOnJudgeError: true });
    expect(r.review.passed).toBe(false);
    expect(r.review.judged).toBe(false);
    expect(r.review.findings.map((f) => f.criterionId)).toEqual(["judge-unavailable"]);
    spy.mockRestore();
  });

  it("không fail-closed → advisory judge-unavailable không chặn passed", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await generateWithRubric({ rubric, ctx, generate, judge: failingJudge, maxRevisions: 0 });
    expect(r.review.passed).toBe(true);
    expect(r.review.findings.map((f) => f.criterionId)).toEqual(["judge-unavailable"]);
    spy.mockRestore();
  });

  it("không có judge lỗi thì fail-closed không ảnh hưởng gì", async () => {
    const r = await generateWithRubric({ rubric, ctx, generate, judge: passJudge, failClosedOnJudgeError: true });
    expect(r.review).toEqual({ passed: true, findings: [], rounds: 1, judged: true });
  });
});
