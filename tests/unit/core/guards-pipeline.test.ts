import { describe, it, expect } from "vitest";
import { finalizePlanOutput } from "@/core/guardrails";
import { sampleLessonPlan } from "../../fixtures/lesson-plan";

describe("Lưới an toàn cuối (sau vòng tiêu chí của AI)", () => {
  it("giáo án sạch đi qua nguyên vẹn, không có chỉnh sửa", () => {
    const r = finalizePlanOutput(sampleLessonPlan);
    expect(r.corrections).toEqual([]);
    expect(r.plan).toEqual(sampleLessonPlan);
  });

  it("thay từ chẩn đoán còn sót (BR-004) và hạ cờ trích dẫn không có trong kho (BR-003)", () => {
    const r = finalizePlanOutput({
      ...sampleLessonPlan,
      teacherScript: "Bé tăng động hãy ngồi yên.",
      legalReference: { ...sampleLessonPlan.legalReference, documentCode: "TT 123/FAKE", isVerified: true },
    });
    expect(r.plan.teacherScript).not.toContain("tăng động");
    expect(r.plan.legalReference.isVerified).toBe(false);
    expect(r.corrections.map((v) => v.rule)).toEqual(expect.arrayContaining(["BR-003", "BR-004"]));
  });

  it("KHÔNG tự chèn cảnh báo an toàn (an toàn do tiêu chí + cổng phê duyệt đảm nhiệm)", () => {
    const r = finalizePlanOutput({ ...sampleLessonPlan, safetyWarnings: [] });
    expect(r.plan.safetyWarnings).toEqual([]);
  });

  it("căn cứ tự nhận chưa xác minh thì giữ nguyên, không bị coi là vi phạm", () => {
    const r = finalizePlanOutput({ ...sampleLessonPlan, legalReference: { documentCode: "", relevantSection: "", summary: "", isVerified: false } });
    expect(r.corrections).toEqual([]);
  });
});
