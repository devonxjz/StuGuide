import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createRepositories, type Repositories } from "@/data/repositories";
import { sampleLessonPlan } from "../fixtures/lesson-plan";

let repos: Repositories;
let ids: Awaited<ReturnType<typeof createTestDb>>["ids"];
let prisma: Awaited<ReturnType<typeof createTestDb>>["prisma"];

beforeAll(async () => {
  const db = await createTestDb();
  prisma = db.prisma;
  ids = db.ids;
  repos = createRepositories(prisma);
});
afterAll(async () => prisma.$disconnect());

describe("seed demo data (spec mục 18)", () => {
  it("có lớp MG nhỡ B1 với bé Trần Gia Huy và cảnh báo 3 tuần", async () => {
    const students = await repos.students.listByClass(ids.classId);
    expect(students.map((s) => s.fullName)).toContain("Trần Gia Huy");
    const alerts = await repos.assessments.listAlerts(ids.classId);
    expect(alerts[0].weekCount).toBe(3);
    expect(alerts[0].student.fullName).toBe("Trần Gia Huy");
  });

  it("có bài mẫu 'Chuyến xe tình bạn' đã chia sẻ", async () => {
    const plans = await repos.lessonPlans.listByClass(ids.classId);
    const main = plans.find((p) => p.gameName?.includes("Chuyến xe tình bạn"));
    expect(main?.status).toBe("shared");
  });
});

describe("lessonPlans repo", () => {
  it("tạo bản nháp ai_draft và đọc lại nội dung có cấu trúc", async () => {
    const created = await repos.lessonPlans.create({
      classId: ids.classId,
      teacherId: ids.teacherId,
      input: {
        ageGroup: "4-5y",
        developmentArea: "social-emotional",
        topic: "Gia đình",
        materials: ["Rổ nhựa"],
        duration: 20,
        space: "indoor",
        stemEnabled: false,
        folkGameEnabled: true,
      },
      content: sampleLessonPlan,
      violations: [],
    });
    expect(created.status).toBe("ai_draft");
    const found = await repos.lessonPlans.findById(created.id);
    expect(found?.procedure).toHaveLength(3);
    expect(found?.materials).toEqual(["Rổ nhựa"]);
  });

  it("sửa một phần ghi PlanVersion tăng dần", async () => {
    const plan = (await repos.lessonPlans.listByClass(ids.classId))[0];
    await repos.lessonPlans.updateSection(plan.id, "teacherScript", "Lời dẫn mới", ids.teacherId, "Cô sửa lời dẫn");
    await repos.lessonPlans.updateSection(plan.id, "gameName", "Tên mới", ids.teacherId, "Đổi tên");
    const versions = await repos.lessonPlans.listVersions(plan.id);
    expect(versions.map((v) => v.versionNumber)).toEqual([1, 2]);
    expect((await repos.lessonPlans.findById(plan.id))?.teacherScript).toBe("Lời dẫn mới");
  });

  it("đổi trạng thái sang approved ghi approvedAt/approvedBy", async () => {
    const draft = (await repos.lessonPlans.listByClass(ids.classId)).find((p) => p.status === "ai_draft")!;
    const approved = await repos.lessonPlans.setStatus(draft.id, "approved", ids.teacherId);
    expect(approved.status).toBe("approved");
    expect(approved.approvedBy).toBe(ids.teacherId);
    expect(approved.approvedAt).toBeInstanceOf(Date);
  });
});

describe("assessments repo", () => {
  it("lưu đánh giá cả lớp là idempotent (unique checklist x student)", async () => {
    const plan = (await repos.lessonPlans.listByClass(ids.classId)).find((p) => p.status === "approved")!;
    const checklist = await repos.assessments.createChecklist(plan.id, ids.classId, ["a", "b", "c"]);
    const students = await repos.students.listByClass(ids.classId);
    const entries = students.map((s) => ({
      studentId: s.id,
      overallRating: "achieved" as const,
      ratings: { "0": "achieved" as const, "1": "achieved" as const, "2": "achieved" as const },
    }));
    await repos.assessments.saveAssessments(checklist.id, entries);
    await repos.assessments.saveAssessments(checklist.id, entries);
    expect(await prisma.studentAssessment.count({ where: { checklistId: checklist.id } })).toBe(students.length);
  });
});

describe("audit repo", () => {
  it("ghi và liệt kê nhật ký mới nhất trước", async () => {
    await repos.audit.log({ userId: ids.principalId, action: "export_report" });
    const logs = await repos.audit.list(5);
    expect(logs[0].action).toBe("export_report");
  });
});
