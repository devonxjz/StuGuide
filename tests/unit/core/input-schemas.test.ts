import { describe, it, expect } from "vitest";
import { idSchema, lineText, parentTokenSchema } from "@/core/schemas/common.schema";
import { createPlanInputSchema } from "@/core/schemas/form-inputs.schema";
import { saveAssessmentInputSchema } from "@/core/schemas/assessment.schema";
import { sessionPayloadSchema } from "@/core/schemas/family.schema";
import { feedbackInputSchema } from "@/core/schemas/feedback.schema";
import { parentCardEditSchema } from "@/core/schemas/parent-card.schema";
import { sectionSchemas } from "@/core/schemas/lesson-plan.schema";

const plan = { ageGroup: "4-5y", developmentArea: "social-emotional", topic: "Tình bạn", materials: ["Rổ"], duration: 20, space: "indoor" };

describe("schema đầu vào (lớp lọc 2: định dạng, độ dài, trường lạ)", () => {
  it("id/token: chỉ chữ, số, gạch; chặn ký tự đường dẫn, SQL, quá dài", () => {
    for (const ok of ["demo-teacher-lan", "8b1c2f9e-1d2a-4c3b-9a8b-112233445566", "abc_DEF-123"]) expect(idSchema.safeParse(ok).success).toBe(true);
    for (const bad of ["", "../x", "a b", "x'; DROP TABLE", "a".repeat(65), "<script>"]) expect(idSchema.safeParse(bad).success).toBe(false);
    expect(parentTokenSchema.safeParse("short").success).toBe(false);
    expect(parentTokenSchema.safeParse("demo-token-1").success).toBe(true);
  });

  it("lineText: cắt khoảng trắng, chặn rỗng, chặn xuống dòng, giới hạn độ dài", () => {
    const s = lineText(10);
    expect(s.parse("  abc  ")).toBe("abc");
    expect(s.safeParse("   ").success).toBe(false);
    expect(s.safeParse("a\nb").success).toBe(false);
    expect(s.safeParse("x".repeat(11)).success).toBe(false);
  });

  it("form soạn giáo án: thiếu/sai từng trường đều có thông điệp tiếng Việt; loại trùng học liệu", () => {
    expect(createPlanInputSchema.parse({ ...plan, materials: ["Rổ", "Rổ", "Bóng"] }).materials).toEqual(["Rổ", "Bóng"]);
    const r = createPlanInputSchema.safeParse({ ...plan, topic: "", materials: [], duration: 17 });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message)).toEqual(expect.arrayContaining(["Vui lòng nhập chủ đề bài dạy", "Vui lòng chọn ít nhất một học liệu", "Thời lượng phải là 15, 20, 25 hoặc 30 phút"]));
    expect(createPlanInputSchema.safeParse({ ...plan, topic: "x".repeat(121) }).success).toBe(false);
    expect(createPlanInputSchema.safeParse({ ...plan, materials: Array.from({ length: 16 }, (_, i) => `m${i}`) }).success).toBe(false);
    expect(createPlanInputSchema.safeParse({ ...plan, classNotes: "x".repeat(1001) }).success).toBe(false);
  });

  it("trường lạ bị từ chối (mass assignment: không cho client tự đặt teacherId/status…)", () => {
    expect(createPlanInputSchema.safeParse({ ...plan, status: "approved", teacherId: "x" }).success).toBe(false);
    expect(feedbackInputSchema.safeParse({ token: "demo-token-1", response: "completed", parentId: "x" }).success).toBe(false);
  });

  it("đánh giá: chỉ số tiêu chí phải là số, mỗi bé một lần, ghi chú tối đa 500 ký tự", () => {
    const entry = { studentId: "s1", overallRating: "achieved", ratings: { "0": "achieved" } };
    expect(saveAssessmentInputSchema.safeParse({ checklistId: "c1", entries: [entry] }).success).toBe(true);
    expect(saveAssessmentInputSchema.safeParse({ checklistId: "c1", entries: [{ ...entry, ratings: { abc: "achieved" } }] }).success).toBe(false);
    expect(saveAssessmentInputSchema.safeParse({ checklistId: "c1", entries: [entry, entry] }).success).toBe(false);
    expect(saveAssessmentInputSchema.safeParse({ checklistId: "c1", entries: [{ ...entry, note: "x".repeat(501) }] }).success).toBe(false);
    expect(saveAssessmentInputSchema.safeParse({ checklistId: "c1", entries: [] }).success).toBe(false);
  });

  it("phiên học ở nhà: dữ liệu sự kiện phẳng, giới hạn khóa/độ dài, thời điểm ISO, mã phiên đúng định dạng", () => {
    const ev = { seq: 1, type: "note", at: "2026-10-24T08:00:00.000Z", data: { text: "Bé thích xe" } };
    const base = { sessionId: "sess-12345678", studentId: "s1", events: [ev], transcript: [] };
    expect(sessionPayloadSchema.safeParse(base).success).toBe(true);
    expect(sessionPayloadSchema.safeParse({ ...base, events: [{ ...ev, data: { nested: { a: 1 } } }] }).success).toBe(false);
    expect(sessionPayloadSchema.safeParse({ ...base, events: [{ ...ev, data: { text: "x".repeat(501) } }] }).success).toBe(false);
    expect(sessionPayloadSchema.safeParse({ ...base, events: [{ ...ev, data: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`k${i}`, i])) }] }).success).toBe(false);
    expect(sessionPayloadSchema.safeParse({ ...base, events: [{ ...ev, at: "hôm qua" }] }).success).toBe(false);
    expect(sessionPayloadSchema.safeParse({ ...base, sessionId: "../../x" }).success).toBe(false);
  });

  it("sửa tay giáo án/thẻ: giới hạn độ dài và số phần tử", () => {
    expect(sectionSchemas.gameName.safeParse({ value: "x".repeat(121) }).success).toBe(false);
    expect(sectionSchemas.objectives.safeParse({ value: [] }).success).toBe(false);
    expect(sectionSchemas.teacherScript.safeParse({ value: "   " }).success).toBe(false);
    const card = { greeting: "Chào", classSummary: "Hôm nay", missionTitle: "Nhiệm vụ", duration: 5, eqQuestions: ["a", "b"], adultRole: "Lắng nghe" };
    expect(parentCardEditSchema.safeParse(card).success).toBe(true);
    expect(parentCardEditSchema.safeParse({ ...card, eqQuestions: ["a"] }).success).toBe(false);
    expect(parentCardEditSchema.safeParse({ ...card, status: "sent" }).success).toBe(false);
  });
});
