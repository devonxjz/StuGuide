import { describe, it, expect, vi, afterEach } from "vitest";
import type { AiEngine } from "@/ai/engine";
import type { Finding } from "@/ai/quality/rubric";
import { sampleLessonPlan } from "../../fixtures/lesson-plan";
import type { EvalCase } from "../../../evals/lib/case.schema";
import { runAll, runEvalCase } from "../../../evals/lib/runner";

const evalCase = (id: string): EvalCase => ({
  id,
  title: "t",
  input: { ageGroup: "4-5y", developmentArea: "social-emotional", topic: "t", materials: ["Rổ nhựa"], duration: 20, space: "indoor", stemEnabled: false, folkGameEnabled: false },
  expectations: [{ id: "hop-sua", description: "d", scope: "all", mode: "mention", anyOf: ["hộp sữa"] }],
});

const engineReturning = (findings: Finding[]) =>
  ({ generateLessonPlan: vi.fn().mockResolvedValue({ value: sampleLessonPlan, review: { passed: true, findings, rounds: 1, judged: true } }) }) as unknown as AiEngine;

afterEach(() => vi.restoreAllMocks());

describe("runEvalCase", () => {
  it("chấm điểm đầu ra của engine và gọi engine với đúng đầu vào, không có trí nhớ lớp", async () => {
    const engine = engineReturning([]);
    const c = evalCase("lp-01");
    const result = await runEvalCase(engine, c);
    expect(result).toMatchObject({ ok: true, score: { id: "lp-01", score: 1 } });
    expect(engine.generateLessonPlan).toHaveBeenCalledWith(c.input, { teacherMemories: [], recentPlans: [] });
  });

  it("bộ chấm không chạy được → lỗi hạ tầng, KHÔNG tính là điểm thấp", async () => {
    const result = await runEvalCase(engineReturning([{ criterionId: "judge-unavailable", severity: "advisory", issues: ["lỗi"] }]), evalCase("lp-02"));
    expect(result).toEqual({ ok: false, id: "lp-02", error: "Bộ chấm AI không chạy được" });
  });

  it("engine ném lỗi (Error hoặc giá trị khác) → trả lỗi thay vì làm hỏng cả run", async () => {
    const failing = { generateLessonPlan: vi.fn().mockRejectedValue(new Error("rate limit")) } as unknown as AiEngine;
    expect(await runEvalCase(failing, evalCase("lp-03"))).toEqual({ ok: false, id: "lp-03", error: "rate limit" });
    const throwsString = { generateLessonPlan: vi.fn().mockRejectedValue("boom") } as unknown as AiEngine;
    expect(await runEvalCase(throwsString, evalCase("lp-04"))).toEqual({ ok: false, id: "lp-04", error: "boom" });
  });
});

describe("runAll", () => {
  it("chạy theo lô nhỏ, giữ nguyên thứ tự và không để một case lỗi chặn các case khác", async () => {
    let running = 0;
    let peak = 0;
    const engine = {
      generateLessonPlan: vi.fn(async (input: { topic: string }) => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, 5));
        running--;
        if (input.topic === "loi") throw new Error("hỏng");
        return { value: sampleLessonPlan, review: { passed: true, findings: [], rounds: 1, judged: true } };
      }),
    } as unknown as AiEngine;
    const cases = ["a", "loi", "c", "d", "e"].map((topic, i) => ({ ...evalCase(`lp-0${i + 1}`), input: { ...evalCase("x").input, topic } }));

    const results = await runAll(engine, cases, 2);

    expect(results.map((r) => r.ok)).toEqual([true, false, true, true, true]);
    expect(peak).toBe(2);
  });

  it("danh sách rỗng → kết quả rỗng", async () => {
    expect(await runAll(engineReturning([]), [])).toEqual([]);
  });
});
