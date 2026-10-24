import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createRepositories } from "@/data/repositories";
import { createServices, type Services } from "@/services";
import { createFakeEngine } from "../helpers/fake-engine";
import { FlowError, NotFoundError } from "@/core/errors";
import { PermissionError } from "@/core/guardrails";
import { ZodError } from "zod";
import type { CreatePlanInput } from "@/core/schemas/form-inputs.schema";

type Db = Awaited<ReturnType<typeof createTestDb>>;
let db: Db;
let svc: Services;
const published: { cardId: string }[] = [];

const input: CreatePlanInput = {
  ageGroup: "4-5y",
  developmentArea: "social-emotional",
  topic: "Bản thân & Tình bạn",
  materials: ["Vỏ hộp sữa tái chế", "Rổ nhựa", "Bóng nhựa nhỏ"],
  duration: 20,
  space: "indoor",
  stemEnabled: false,
  folkGameEnabled: false,
};

beforeAll(async () => {
  db = await createTestDb();
  svc = createServices({
    repos: createRepositories(db.prisma),
    engine: createFakeEngine(),
    events: { publishFeedback: (cardId) => void published.push({ cardId }) },
  });
});
afterAll(async () => db.prisma.$disconnect());

const teacher = () => ({ id: db.ids.teacherId, role: "teacher" as const, classId: db.ids.classId, schoolId: db.ids.schoolId });
const principal = () => ({ id: db.ids.principalId, role: "principal" as const, schoolId: db.ids.schoolId });

describe("LessonPlannerService", () => {
  it("tạo bản nháp ai_draft đã qua guardrail và ghi audit (BR-001)", async () => {
    const { plan, violations } = await svc.lessonPlanner.create(input, teacher());
    expect(plan.status).toBe("ai_draft");
    expect(plan.safetyWarnings.length).toBeGreaterThan(0);
    expect(plan.legalReference?.isVerified).toBe(true);
    expect(Array.isArray(violations)).toBe(true);
    const logs = await db.prisma.auditLog.findMany({ where: { action: "create_plan", target: plan.id } });
    expect(logs).toHaveLength(1);
  });

  it("chặn input thiếu (ERR-INPUT-01) trước khi gọi AI", async () => {
    await expect(svc.lessonPlanner.create({ ...input, materials: [] }, teacher())).rejects.toBeInstanceOf(ZodError);
  });

  it("phụ huynh không được soạn giáo án", async () => {
    await expect(svc.lessonPlanner.create(input, { id: db.ids.parentIds[0], role: "parent" })).rejects.toBeInstanceOf(PermissionError);
  });

  it("sửa tay và viết lại bằng AI đều ghi PlanVersion", async () => {
    const { plan } = await svc.lessonPlanner.create(input, teacher());
    await svc.lessonPlanner.editSection(plan.id, "teacherScript", "Lời dẫn do cô viết", teacher());
    const rewritten = await svc.lessonPlanner.rewriteSection(plan.id, "gameName", "vui hơn", teacher());
    expect(rewritten.gameName).not.toBe(plan.gameName);
    const versions = await db.prisma.planVersion.findMany({ where: { planId: plan.id }, orderBy: { versionNumber: "asc" } });
    expect(versions.map((v) => v.sectionEdited)).toEqual(["teacherScript", "gameName"]);
  });

  it("language guard làm sạch khi cô nhập từ cấm", async () => {
    const { plan } = await svc.lessonPlanner.create(input, teacher());
    const updated = await svc.lessonPlanner.editSection(plan.id, "teacherScript", "Bé tăng động hãy ngồi yên", teacher());
    expect(updated.teacherScript).not.toMatch(/tăng động/);
  });

  it("phê duyệt tạo checklist 3–5 tiêu chí; BGH duyệt bài chờ rà soát", async () => {
    const { plan } = await svc.lessonPlanner.create(input, teacher());
    const approved = await svc.lessonPlanner.approve(plan.id, teacher());
    expect(approved.status).toBe("approved");
    expect(approved.approvedBy).toBe(db.ids.teacherId);
    const { checklist, criteria } = await svc.assessment.createChecklist(plan.id, teacher());
    expect(criteria.length).toBeGreaterThanOrEqual(3);
    expect(criteria.length).toBeLessThanOrEqual(5);
    // idempotent: gọi lại không tạo checklist trùng
    const again = await svc.assessment.createChecklist(plan.id, teacher());
    expect(again.checklist.id).toBe(checklist.id);

    const queued = await svc.lessonPlanner.approve(db.ids.reviewPlanId, principal());
    expect(queued.status).toBe("approved");
  });

  it("BGH yêu cầu sửa lại: bài rời hàng chờ duyệt, về bản nháp cho giáo viên; giáo viên không tự 'yêu cầu sửa' được", async () => {
    const { plan } = await svc.lessonPlanner.create(input, teacher());
    expect((await svc.lessonPlanner.submitForReview(plan.id, teacher())).status).toBe("needs_review");
    await expect(svc.lessonPlanner.requestChanges(plan.id, teacher())).rejects.toBeInstanceOf(FlowError);
    const r = await svc.lessonPlanner.requestChanges(plan.id, principal());
    expect(r.status).toBe("ai_draft");
  });

  it("BGH thiếu thông tin trường (actor không có schoolId) bị từ chối – fail-closed", async () => {
    await expect(svc.lessonPlanner.approve(db.ids.reviewPlanId, { id: db.ids.principalId, role: "principal" })).rejects.toBeInstanceOf(PermissionError);
  });

  it("không tìm thấy giáo án", async () => {
    await expect(svc.lessonPlanner.approve("nope", teacher())).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ParentCardService – Human-in-the-loop (ERR-FLOW-01)", () => {
  it("không cho tạo/gửi thẻ khi bài chưa được duyệt", async () => {
    const { plan } = await svc.lessonPlanner.create(input, teacher());
    await expect(svc.parentCards.generate(plan.id, teacher())).rejects.toBeInstanceOf(FlowError);
  });

  it("duyệt → tạo thẻ → gửi: sinh token riêng cho từng bé và chuyển bài sang shared", async () => {
    const { plan } = await svc.lessonPlanner.create(input, teacher());
    await svc.lessonPlanner.approve(plan.id, teacher());
    const card = await svc.parentCards.generate(plan.id, teacher());
    expect(card.status).toBe("draft");
    const sent = await svc.parentCards.send(card.id, teacher());
    expect(sent.links).toHaveLength(db.ids.studentIds.length);
    expect(new Set(sent.links.map((l) => l.token)).size).toBe(db.ids.studentIds.length);
    expect((await svc.lessonPlanner.get(plan.id)).status).toBe("shared");
  });

  it("thống kê phản hồi của thẻ mẫu: 5/8 hoàn thành", async () => {
    const stats = await svc.parentCards.stats(db.ids.cardId);
    expect(stats.total).toBe(8);
    expect(stats.completed).toBe(5);
    expect(stats.needsPractice).toBe(1);
    expect(stats.pending).toBe(2);
    expect(stats.completionRate).toBe(63);
  });
});

describe("AssessmentService – 30 giây & chuỗi 3 tuần", () => {
  it("lưu đánh giá, phát hiện chuỗi >=3 tuần cho Gia Huy và sinh cảnh báo không dán nhãn", async () => {
    const { plan } = await svc.lessonPlanner.create(input, teacher());
    await svc.lessonPlanner.approve(plan.id, teacher());
    const { checklist, criteria } = await svc.assessment.createChecklist(plan.id, teacher());
    const entries = db.ids.studentIds.map((studentId) => ({
      studentId,
      overallRating: studentId === db.ids.huyId ? ("needs_practice" as const) : ("achieved" as const),
      ratings: Object.fromEntries(criteria.map((_, i) => [String(i), studentId === db.ids.huyId ? "needs_practice" : "achieved"])) as Record<string, "achieved" | "needs_practice">,
      note: studentId === db.ids.huyId ? "Bé đứng quan sát, chưa chủ động rủ bạn." : undefined,
    }));
    const result = await svc.assessment.save({ checklistId: checklist.id, entries }, teacher());
    expect(result.alerts.map((a) => a.studentId)).toEqual([db.ids.huyId]);
    expect(result.alerts[0].weekCount).toBeGreaterThanOrEqual(3);
    expect(result.alerts[0].pattern).not.toMatch(/tự kỷ|tăng động|bệnh/i);
    expect(result.alerts[0].disclaimer).toMatch(/không phải chẩn đoán/i);
  });

  it("BGH chỉ xem, không được lưu đánh giá", async () => {
    await expect(svc.assessment.save({ checklistId: "x", entries: [{ studentId: "s", overallRating: "achieved", ratings: {} }] }, principal())).rejects.toBeInstanceOf(PermissionError);
  });

  it("xóa cảnh báo khi chuỗi bị ngắt", async () => {
    const { plan } = await svc.lessonPlanner.create(input, teacher());
    await svc.lessonPlanner.approve(plan.id, teacher());
    const { checklist, criteria } = await svc.assessment.createChecklist(plan.id, teacher());
    const entries = db.ids.studentIds.map((studentId) => ({
      studentId,
      overallRating: "achieved" as const,
      ratings: Object.fromEntries(criteria.map((_, i) => [String(i), "achieved"])) as Record<string, "achieved">,
    }));
    const result = await svc.assessment.save({ checklistId: checklist.id, entries }, teacher());
    expect(result.alerts).toEqual([]);
    expect(await svc.assessment.listAlerts(db.ids.classId)).toEqual([]);
  });
});

describe("FeedbackService – quyền riêng tư (BR-006) & realtime", () => {
  it("phụ huynh chỉ thấy dữ liệu của bé mình, không có danh sách lớp", async () => {
    const view = await svc.feedback.view(db.ids.tokens[db.ids.huyId]);
    expect(view.student.fullName).toBe("Trần Gia Huy");
    expect(JSON.stringify(view)).not.toContain("Nguyễn Minh Anh");
    expect(view.card.eqQuestions.length).toBeGreaterThanOrEqual(2);
  });

  it("phản hồi 1-chạm cập nhật thống kê và phát sự kiện realtime", async () => {
    const before = await svc.parentCards.stats(db.ids.cardId);
    const out = await svc.feedback.submit({ token: db.ids.tokens[db.ids.huyId], response: "completed" });
    expect(out.stats.completed).toBe(before.completed + 1);
    expect(published.at(-1)?.cardId).toBe(db.ids.cardId);
    // gửi lại đổi ý: vẫn một phản hồi / bé / thẻ
    await svc.feedback.submit({ token: db.ids.tokens[db.ids.huyId], response: "needs_practice", message: "Mai con thử lại ạ" });
    const stats = await svc.parentCards.stats(db.ids.cardId);
    expect(stats.total).toBe(8);
    expect(stats.completed).toBe(before.completed);
  });

  it("token chỉ trả dữ liệu của đúng một bé (không có tham số nào để chọn bé khác)", async () => {
    const view = await svc.feedback.view(db.ids.tokens[db.ids.huyId]);
    expect(view.student.id).toBe(db.ids.huyId);
    expect(JSON.stringify(view)).not.toContain(db.ids.otherStudentId);
  });

  it("token lạ → NotFound và ghi nhật ký an ninh không có user", async () => {
    await expect(svc.feedback.view("token-gia")).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.feedback.view("../../x")).rejects.toBeInstanceOf(NotFoundError);
    const log = await db.prisma.auditLog.findFirst({ where: { action: "access_denied", userId: null } });
    expect(log).not.toBeNull();
  });
});

describe("ReportService – Ban giám hiệu", () => {
  it("dashboard có KPI, độ bao phủ 5 mảng, hàng đợi duyệt và audit log", async () => {
    const d = await svc.reports.dashboard(principal());
    expect(d.kpis.approvedLast30Days).toBeGreaterThan(0);
    expect(d.kpis.legalComplianceRate).toBe(100);
    expect(d.kpis.parentEngagementRate).toBeGreaterThan(0);
    expect(d.areaCoverage).toHaveLength(5);
    expect(d.auditLog.length).toBeGreaterThan(0);
    expect(Array.isArray(d.approvalQueue)).toBe(true);
  });

  it("giáo viên không xem được dashboard toàn trường; xuất báo cáo ghi audit", async () => {
    await expect(svc.reports.dashboard(teacher())).rejects.toBeInstanceOf(PermissionError);
    const report = await svc.reports.exportReport(principal());
    expect(report.title).toMatch(/Báo cáo/);
    expect(await db.prisma.auditLog.count({ where: { action: "export_report" } })).toBeGreaterThan(0);
  });
});
