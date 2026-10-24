import { ALERT_WEEK_THRESHOLD } from "@/core/constants/status";
import { detectNeedsPracticeStreak } from "@/core/analytics/needs-practice-streak";
import { FlowError, InputError, NotFoundError } from "@/core/errors";
import { assertCan, PermissionError } from "@/core/guardrails";
import { sanitizeDeep } from "@/core/guardrails/language-guard";
import { saveAssessmentInputSchema } from "@/core/schemas/assessment.schema";
import type { Actor, ServiceDeps } from "./types";
import type { AuditService } from "./audit.service";
import type { LessonPlannerService } from "./lesson-planner.service";
import { assertClassAccess } from "./access";

/** Số phân tích hành vi chạy song song tối đa (mỗi phân tích là vài lượt gọi AI). */
const ANALYSIS_CONCURRENCY = 3;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export function createAssessmentService({ repos, engine }: ServiceDeps, audit: AuditService, planner: LessonPlannerService) {
  const listAlerts = (classId: string) => repos.assessments.listAlerts(classId);

  return {
    listAlerts,

    /** Sinh tiêu chí quan sát từ mục tiêu bài (AI, chấm theo tiêu chí) và tạo checklist. Idempotent theo giáo án. */
    async createChecklist(planId: string, actor: Actor) {
      assertCan(actor.role, "assessment:write");
      const plan = await planner.get(planId);
      await assertClassAccess(repos, actor, plan.classId);
      if (plan.status !== "approved" && plan.status !== "shared") {
        throw new FlowError("Vui lòng phê duyệt kế hoạch trước khi tạo checklist quan sát");
      }

      const existing = await repos.assessments.findChecklistByPlan(planId);
      if (existing) return { checklist: existing, criteria: existing.criteria as string[], created: false };

      const generated = await engine.generateChecklist({ gameName: plan.gameName ?? "", objectives: plan.objectives });
      const criteria = sanitizeDeep(generated.value).value;
      await repos.lessonPlans.setObservationCriteria(planId, criteria);
      const checklist = await repos.assessments.createChecklist(planId, plan.classId, criteria);
      await audit.log({ userId: actor.id, action: "create_checklist", target: planId });
      return { checklist, criteria, created: true };
    },

    /** Dữ liệu cho màn hình đánh giá 30 giây. */
    async getSheet(planId: string, actor: Actor) {
      assertCan(actor.role, "assessment:read");
      const plan = await planner.get(planId);
      await assertClassAccess(repos, actor, plan.classId);
      const checklist = await repos.assessments.findChecklistByPlan(planId);
      if (!checklist) throw new NotFoundError("checklist quan sát");
      const [students, alerts] = await Promise.all([repos.students.listByClass(plan.classId), listAlerts(plan.classId)]);
      return { plan, checklist, criteria: checklist.criteria as string[], students, assessments: checklist.assessments, alerts };
    },

    /**
     * Lưu hồ sơ minh chứng rồi chạy AI Behavioral Analytics:
     * bé có >= 3 tuần liên tiếp "cần rèn thêm" -> sinh "Gợi ý quan sát sâu" (không chẩn đoán).
     */
    async save(rawInput: unknown, actor: Actor) {
      assertCan(actor.role, "assessment:write");
      const input = saveAssessmentInputSchema.parse(rawInput);
      const checklist = await repos.assessments.findChecklistById(input.checklistId);
      if (!checklist) throw new NotFoundError("checklist quan sát");
      await assertClassAccess(repos, actor, checklist.classId);

      const criteria = checklist.criteria as string[];
      const students = await repos.students.listByClass(checklist.classId);
      const known = new Set(students.map((s) => s.id));
      if (input.entries.some((e) => !known.has(e.studentId))) throw new PermissionError("Có học sinh không thuộc lớp này");
      if (input.entries.some((e) => Object.keys(e.ratings).some((k) => Number(k) >= criteria.length))) {
        throw new InputError(`Đánh giá chứa tiêu chí không có trong checklist (checklist có ${criteria.length} tiêu chí)`);
      }

      // BR-004: ghi chú của cô cũng không được chứa nhãn chẩn đoán (ghi chú đi vào hồ sơ minh chứng và phân tích AI)
      const entries = input.entries.map((e) => ({ ...e, note: e.note ? sanitizeDeep(e.note).value : undefined }));
      await repos.assessments.saveAssessments(input.checklistId, entries);

      const history = await repos.assessments.historyByStudent(checklist.classId);
      const existingAlerts = await listAlerts(checklist.classId);
      const work: { student: (typeof students)[number]; weekCount: number }[] = [];

      for (const student of students) {
        const streak = detectNeedsPracticeStreak(history.get(student.id) ?? [], ALERT_WEEK_THRESHOLD);
        const current = existingAlerts.find((a) => a.studentId === student.id);
        if (!streak.triggered) {
          if (current) await repos.assessments.clearAlert(student.id);
          continue;
        }
        if (current?.weekCount !== streak.weekCount) work.push({ student, weekCount: streak.weekCount });
      }

      await mapLimit(work, ANALYSIS_CONCURRENCY, async ({ student, weekCount }) => {
        const points = history.get(student.id) ?? [];
        const latest = entries.find((e) => e.studentId === student.id);
        const weakCriteria = latest ? Object.entries(latest.ratings).filter(([, r]) => r === "needs_practice").map(([i]) => criteria[Number(i)]).filter(Boolean) : [];
        const notes = points.filter((p) => p.note).slice(0, ALERT_WEEK_THRESHOLD).reverse().map((p) => p.note as string);
        const generated = await engine.analyzeBehavior({ studentName: student.fullName, weekCount, criteria, weakCriteria, notes });
        const analysis = sanitizeDeep(generated.value).value;
        await repos.assessments.createAlert({ studentId: student.id, weekCount, ...analysis });
      });

      await audit.log({ userId: actor.id, action: "save_assessment", target: input.checklistId });
      const triggeredIds = new Set(students.filter((s) => detectNeedsPracticeStreak(history.get(s.id) ?? [], ALERT_WEEK_THRESHOLD).triggered).map((s) => s.id));
      const alerts = (await listAlerts(checklist.classId)).filter((a) => triggeredIds.has(a.studentId));
      return { alerts };
    },
  };
}
export type AssessmentService = ReturnType<typeof createAssessmentService>;
