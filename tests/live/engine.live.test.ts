import { describe, it, expect, beforeAll } from "vitest";
import { createAiEngine, type PlanningContext } from "@/ai/engine";
import type { Review } from "@/ai/quality/rubric";
import { finalizePlanOutput } from "@/core/guardrails";
import { checkLanguage } from "@/core/guardrails/language-guard";
import { checkScreenFree } from "@/core/guardrails/screen-free-guard";
import { lessonPlanOutputSchema } from "@/core/schemas/lesson-plan.schema";
import { checklistOutputSchema, behaviorAnalysisOutputSchema } from "@/core/schemas/assessment.schema";
import { parentCardContentSchema } from "@/core/schemas/parent-card.schema";
import type { CreatePlanInput } from "@/core/schemas/form-inputs.schema";
import type { LessonPlanOutput } from "@/core/schemas/lesson-plan.schema";

const input: CreatePlanInput = {
  ageGroup: "4-5y",
  developmentArea: "social-emotional",
  topic: "Bản thân & Tình bạn",
  materials: ["Vỏ hộp sữa tái chế", "Rổ nhựa", "Bóng nhựa nhỏ"],
  duration: 20,
  space: "indoor",
  stemEnabled: true,
  folkGameEnabled: true,
};

describe("Engine AI thật – sáng tạo theo tiêu chí spec 6.2 và 12", () => {
  const engine = createAiEngine();
  const context: PlanningContext = { className: "Lớp MG nhỡ B1", teacherMemories: ["Lớp có nhiều bé nhút nhát, cô thích trò chơi theo cặp"], recentPlans: [] };
  let a: LessonPlanOutput;
  let b: LessonPlanOutput;
  let review: Review;
  const steps: string[] = [];

  beforeAll(async () => {
    const [ga, gb] = await Promise.all([engine.generateLessonPlan(input, context, { onStep: (s) => steps.push(s) }), engine.generateLessonPlan(input, context)]);
    a = ga.value;
    b = gb.value;
    review = ga.review;
  }, 300_000);

  it("output đúng schema, có các bước thật (tra cứu → sinh → chấm), đạt mọi tiêu chí BẮT BUỘC sau vòng tự sửa", () => {
    expect(lessonPlanOutputSchema.safeParse(a).success).toBe(true);
    expect(steps.slice(0, 4)).toEqual(["legal", "safety", "generate", "review"]);
    expect(review.judged).toBe(true);
    expect(review.passed).toBe(true);
    expect(review.findings.filter((f) => f.severity === "blocking")).toEqual([]);
  });

  it("bám ngữ cảnh: dùng đủ 3 vật liệu người dùng chọn", () => {
    const text = JSON.stringify(a).toLowerCase();
    for (const m of ["hộp sữa", "rổ", "bóng"]) expect(text).toContain(m);
  });

  it("căn cứ pháp lý lấy từ kho tri thức và được xác minh (BR-003)", () => {
    expect(a.legalReference.documentCode).toBe("VBHN 01/VBHN-BGDĐT");
    expect(a.legalReference.isVerified).toBe(true);
  });

  it("sáng tạo: tên trò chơi gợi hình, mỗi lần soạn một khác (không rập khuôn)", () => {
    expect(a.gameName.length).toBeGreaterThan(12);
    expect(a.gameName).not.toMatch(/^trò chơi (vận động )?số \d/i);
    expect(a.gameName).not.toBe(b.gameName);
    expect(a.teacherScript).not.toBe(b.teacherScript);
  });

  it("ẩn dụ đồ vật: đạo cụ được gọi bằng tên hình tượng trong phần chuẩn bị/cách chơi", () => {
    const prepAndPlay = [...a.preparation, ...a.procedure.map((s) => s.instructions)].join(" ");
    expect(prepAndPlay).toMatch(/[“"”'‘’]|hóa thành|biến thành|trở thành|gọi là|đóng vai|\(/);
  });

  it("kể chuyện nhập vai: lời dẫn dài, ấm áp, có câu chuyện (không phải mệnh lệnh khô)", () => {
    expect(a.teacherScript.split(/\s+/).length).toBeGreaterThan(40);
    expect(a.teacherScript).toMatch(/các con|chúng mình|nào/i);
  });

  it("tích hợp STEM và dân gian khi bật", () => {
    const text = JSON.stringify(a);
    expect(text).toMatch(/đồng dao|dân gian|rồng rắn|nu na|chi chi/i);
    expect(text).toMatch(/thăng bằng|trọng lực|vì sao|đoán xem|thử|khám phá|quan sát/i);
  });

  it("an toàn & ngôn ngữ: qua toàn bộ guardrail, không từ chẩn đoán, Screen-Free, cảnh báo ≥ 1", () => {
    const final = finalizePlanOutput(a);
    expect(final.plan.safetyWarnings.length).toBeGreaterThan(0);
    expect(final.corrections).toEqual([]);
    expect(checkLanguage(JSON.stringify(a)).passed).toBe(true);
    expect(checkScreenFree([a.teacherScript, ...a.preparation, ...a.procedure.map((s) => s.instructions)].join("\n")).passed).toBe(true);
  });

  it("tiêu chí quan sát là hành vi cụ thể 3–5, câu hỏi EQ mở", () => {
    expect(a.observationCriteria.length).toBeGreaterThanOrEqual(3);
    expect(a.eqQuestions.length).toBeGreaterThanOrEqual(2);
    expect(a.eqQuestions.every((q) => q.trim().endsWith("?"))).toBe(true);
  });

  it("viết lại một phần theo góp ý và checklist/thẻ phụ huynh/phân tích hành vi đều đúng schema, không dán nhãn", async () => {
    const script = (await engine.rewriteSection({ plan: a, section: "teacherScript", instruction: "ngắn gọn hơn, có một câu đồng dao", materials: input.materials, ageGroup: input.ageGroup, duration: input.duration })).value;
    expect(typeof script).toBe("string");
    expect(script).not.toBe(a.teacherScript);

    const criteria = (await engine.generateChecklist(a)).value;
    expect(checklistOutputSchema.safeParse({ criteria }).success).toBe(true);

    const card = (await engine.generateParentCard({ plan: a, teacherName: "Cô Nguyễn Thị Lan", className: "Lớp MG nhỡ B1" })).value;
    expect(parentCardContentSchema.safeParse(card).success).toBe(true);
    expect(checkLanguage(JSON.stringify(card)).passed).toBe(true);

    const behavior = (await engine.analyzeBehavior({
      studentName: "Trần Gia Huy",
      weekCount: 3,
      criteria: a.observationCriteria,
      weakCriteria: a.observationCriteria.slice(0, 1),
      notes: ["Bé ngồi chơi một mình ở góc.", "Bé đứng quan sát, khi cô mời thì chỉ gật đầu.", "Bé nắm tay bạn khi được cô dắt nhưng chưa tự tin."],
    })).value;
    expect(behaviorAnalysisOutputSchema.safeParse(behavior).success).toBe(true);
    expect(checkLanguage(JSON.stringify(behavior)).passed).toBe(true);
  });
});
