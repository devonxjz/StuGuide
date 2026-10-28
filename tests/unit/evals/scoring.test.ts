import { describe, it, expect } from "vitest";
import { lessonPlanRubric } from "@/ai/quality/rubrics";
import type { Finding } from "@/ai/quality/rubric";
import { sampleLessonPlan } from "../../fixtures/lesson-plan";
import type { EvalCase, Expectation } from "../../../evals/lib/case.schema";
import { meetsExpectation, scoreCase, summarize } from "../../../evals/lib/scoring";

const CRITERIA = lessonPlanRubric.criteria.length;
const expectation = (over: Partial<Expectation>): Expectation => ({ id: "e", description: "d", scope: "all", mode: "mention", anyOf: ["x"], ...over });
const evalCase = (expectations: Expectation[]): EvalCase => ({
  id: "lp-01",
  title: "t",
  input: { ageGroup: "4-5y", developmentArea: "social-emotional", topic: "t", materials: ["Rổ nhựa"], duration: 20, space: "indoor", stemEnabled: false, folkGameEnabled: false },
  expectations,
});
const finding = (criterionId: string, severity: Finding["severity"]): Finding => ({ criterionId, severity, issues: ["i"] });

describe("meetsExpectation", () => {
  it("mention: đạt khi có ít nhất một từ khóa, không phân biệt hoa thường", () => {
    expect(meetsExpectation(sampleLessonPlan, expectation({ anyOf: ["KHÔNG CÓ", "HỘP SỮA"] }))).toBe(true);
  });

  it("mention: không đạt khi không có từ khóa nào", () => {
    expect(meetsExpectation(sampleLessonPlan, expectation({ anyOf: ["nam châm"] }))).toBe(false);
  });

  it("avoid: đạt khi không có từ khóa, không đạt khi có", () => {
    expect(meetsExpectation(sampleLessonPlan, expectation({ mode: "avoid", anyOf: ["tự kỷ"] }))).toBe(true);
    expect(meetsExpectation(sampleLessonPlan, expectation({ mode: "avoid", anyOf: ["hộp sữa"] }))).toBe(false);
  });

  it("chỉ tìm trong phạm vi được chọn", () => {
    const inWarnings = expectation({ scope: "safetyWarnings", anyOf: ["cạnh sắc nhọn"] });
    const inProcedure = expectation({ scope: "procedure", anyOf: ["cạnh sắc nhọn"] });
    expect(meetsExpectation(sampleLessonPlan, inWarnings)).toBe(true);
    expect(meetsExpectation(sampleLessonPlan, inProcedure)).toBe(false);
  });

  it("so khớp dạng NFC: từ khóa gõ dạng tổ hợp vẫn khớp", () => {
    expect(meetsExpectation(sampleLessonPlan, expectation({ anyOf: ["hộp sữa".normalize("NFD")] }))).toBe(true);
  });
});

describe("scoreCase", () => {
  it("đạt toàn bộ → điểm 1, không vi phạm", () => {
    const score = scoreCase(evalCase([expectation({ anyOf: ["hộp sữa"] })]), sampleLessonPlan, [], CRITERIA);
    expect(score).toEqual({ id: "lp-01", score: 1, blockingFailures: 0, failed: [] });
  });

  it("trừ điểm cho tiêu chí rubric chưa đạt và đếm riêng vi phạm bắt buộc", () => {
    const score = scoreCase(evalCase([expectation({ anyOf: ["hộp sữa"] })]), sampleLessonPlan, [finding("screen-free", "blocking"), finding("ten-rieng", "advisory")], CRITERIA);
    expect(score.score).toBeCloseTo((CRITERIA + 1 - 2) / (CRITERIA + 1));
    expect(score.blockingFailures).toBe(1);
    expect(score.failed).toEqual(["rubric:screen-free", "rubric:ten-rieng"]);
  });

  it("một tiêu chí nhiều finding chỉ bị trừ một lần", () => {
    const once = scoreCase(evalCase([expectation({ anyOf: ["hộp sữa"] })]), sampleLessonPlan, [finding("screen-free", "blocking")], CRITERIA);
    const twice = scoreCase(evalCase([expectation({ anyOf: ["hộp sữa"] })]), sampleLessonPlan, [finding("screen-free", "blocking"), finding("screen-free", "blocking")], CRITERIA);
    expect(twice.score).toBe(once.score);
  });

  it("kỳ vọng của case chưa đạt cũng làm giảm điểm", () => {
    const score = scoreCase(evalCase([expectation({ id: "nam-cham", anyOf: ["nam châm"] })]), sampleLessonPlan, [], CRITERIA);
    expect(score.score).toBeCloseTo(CRITERIA / (CRITERIA + 1));
    expect(score.failed).toEqual(["expect:nam-cham"]);
  });

  it("điểm không bao giờ âm dù nhiều finding hơn tổng tiêu chí", () => {
    const many = Array.from({ length: CRITERIA + 5 }, (_, i) => finding(`c${i}`, "advisory"));
    expect(scoreCase(evalCase([expectation({ anyOf: ["nam châm"] })]), sampleLessonPlan, many, CRITERIA).score).toBe(0);
  });

  it("phát hiện suy giảm: bỏ chi tiết an toàn khỏi giáo án thì điểm thấp hơn", () => {
    const withSafety = evalCase([expectation({ id: "mep-sac", scope: "safetyWarnings", anyOf: ["cạnh sắc nhọn"] })]);
    const degraded = { ...sampleLessonPlan, safetyWarnings: [{ ...sampleLessonPlan.safetyWarnings[0], description: "Chú ý an toàn." }] };
    expect(scoreCase(withSafety, degraded, [], CRITERIA).score).toBeLessThan(scoreCase(withSafety, sampleLessonPlan, [], CRITERIA).score);
  });
});

describe("summarize", () => {
  it("trung bình điểm và cộng vi phạm bắt buộc", () => {
    const summary = summarize([
      { id: "a", score: 1, blockingFailures: 0, failed: [] },
      { id: "b", score: 0.5, blockingFailures: 2, failed: [] },
    ]);
    expect(summary.overall).toBe(0.75);
    expect(summary.blockingFailures).toBe(2);
  });

  it("danh sách rỗng → điểm 0, không chia cho 0", () => {
    expect(summarize([])).toEqual({ overall: 0, blockingFailures: 0, cases: [] });
  });
});
