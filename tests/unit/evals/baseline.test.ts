import { describe, it, expect } from "vitest";
import { baselineSchema, compareToBaseline, toBaseline } from "../../../evals/lib/baseline";
import { summarize, type CaseScore } from "../../../evals/lib/scoring";

const score = (id: string, value: number, blockingFailures = 0): CaseScore => ({ id, score: value, blockingFailures, failed: [] });
const baseline = toBaseline(summarize([score("lp-01", 0.9), score("lp-02", 0.8), score("lp-03", 1)]));

describe("toBaseline", () => {
  it("lưu điểm và vi phạm bắt buộc theo từng case, hợp lệ với schema", () => {
    expect(baseline.cases["lp-02"]).toEqual({ score: 0.8, blockingFailures: 0 });
    expect(baselineSchema.safeParse(baseline).success).toBe(true);
  });
});

describe("baselineSchema", () => {
  it("từ chối điểm ngoài 0..1, số vi phạm âm và trường lạ", () => {
    expect(baselineSchema.safeParse({ cases: { a: { score: 1.2, blockingFailures: 0 } } }).success).toBe(false);
    expect(baselineSchema.safeParse({ cases: { a: { score: 1, blockingFailures: -1 } } }).success).toBe(false);
    expect(baselineSchema.safeParse({ cases: {}, extra: 1 }).success).toBe(false);
  });
});

describe("compareToBaseline", () => {
  it("đạt khi điểm bằng hoặc cao hơn baseline", () => {
    expect(compareToBaseline(summarize([score("lp-01", 0.9), score("lp-02", 0.95)]), baseline).passed).toBe(true);
  });

  it("đạt khi giảm trong ngưỡng, fail khi giảm vượt ngưỡng", () => {
    expect(compareToBaseline(summarize([score("lp-01", 0.88)]), baseline, 0.03).passed).toBe(true);
    const result = compareToBaseline(summarize([score("lp-01", 0.8)]), baseline, 0.03);
    expect(result.passed).toBe(false);
    expect(result.reasons[0]).toContain("Điểm giảm");
  });

  it("fail khi có thêm vi phạm bắt buộc dù điểm trung bình vẫn ổn", () => {
    const result = compareToBaseline(summarize([score("lp-01", 0.9, 1)]), baseline);
    expect(result.passed).toBe(false);
    expect(result.reasons).toEqual(["Vi phạm bắt buộc tăng: 0 → 1"]);
  });

  it("chạy mẫu nhỏ chỉ so với đúng các case đã chạy", () => {
    const result = compareToBaseline(summarize([score("lp-03", 1)]), baseline);
    expect(result).toMatchObject({ passed: true, baselineOverall: 1, overall: 1 });
  });

  it("bỏ qua case chưa có trong baseline", () => {
    expect(compareToBaseline(summarize([score("lp-01", 0.9), score("lp-99", 0)]), baseline).passed).toBe(true);
  });

  it("fail rõ ràng khi không case nào có trong baseline", () => {
    const result = compareToBaseline(summarize([score("lp-99", 1)]), baseline);
    expect(result.passed).toBe(false);
    expect(result.reasons[0]).toContain("baseline");
  });

  it("run rỗng không có gì để so → fail", () => {
    expect(compareToBaseline(summarize([]), baseline).passed).toBe(false);
  });
});
