import type { Db } from "../prisma";
import type { CreatePlanInput } from "@/core/schemas/form-inputs.schema";
import type { EditableSection, LessonPlanOutput } from "@/core/schemas/lesson-plan.schema";
import type { PlanStatus } from "@/core/constants/status";
import type { Violation } from "@/core/guardrails";
import { toPlanRecord, type PlanRecord } from "./records";

export interface CreatePlanData {
  classId: string;
  teacherId: string;
  input: Omit<CreatePlanInput, "classNotes"> & { classNotes?: string };
  content: LessonPlanOutput;
  violations: Violation[];
}

export function createLessonPlanRepo(db: Db) {
  return {
    async create({ classId, teacherId, input, content, violations }: CreatePlanData): Promise<PlanRecord> {
      const row = await db.lessonPlan.create({
        data: {
          classId,
          teacherId,
          status: "ai_draft",
          ageGroup: input.ageGroup,
          developmentArea: input.developmentArea,
          topic: input.topic,
          duration: input.duration,
          space: input.space,
          stemEnabled: input.stemEnabled,
          folkGameEnabled: input.folkGameEnabled,
          materials: input.materials,
          classNotes: input.classNotes ?? null,
          gameName: content.gameName,
          legalReference: content.legalReference,
          safetyWarnings: content.safetyWarnings,
          objectives: content.objectives,
          preparation: content.preparation,
          procedure: content.procedure,
          teacherScript: content.teacherScript,
          flashcardPrompts: content.flashcards,
          observationCriteria: content.observationCriteria,
          eqQuestions: content.eqQuestions,
          guardViolations: violations as never,
        },
      });
      return toPlanRecord(row);
    },

    async findById(id: string): Promise<PlanRecord | null> {
      const row = await db.lessonPlan.findUnique({ where: { id } });
      return row ? toPlanRecord(row) : null;
    },

    async listByClass(classId: string, limit = 20): Promise<PlanRecord[]> {
      const rows = await db.lessonPlan.findMany({ where: { classId }, orderBy: { createdAt: "desc" }, take: limit });
      return rows.map(toPlanRecord);
    },

    async listBySchool(schoolId: string, status?: PlanStatus) {
      const rows = await db.lessonPlan.findMany({
        where: { class: { schoolId }, ...(status ? { status } : {}) },
        include: { class: true, teacher: true },
        orderBy: { updatedAt: "desc" },
      });
      return rows.map((r) => ({ ...toPlanRecord(r), className: r.class.name, teacherName: r.teacher.fullName }));
    },

    async setStatus(id: string, status: PlanStatus, userId?: string): Promise<PlanRecord> {
      const row = await db.lessonPlan.update({
        where: { id },
        data: status === "approved" ? { status, approvedAt: new Date(), approvedBy: userId ?? null } : { status },
      });
      return toPlanRecord(row);
    },

    /**
     * Sửa một phần và lưu lại PlanVersion (snapshot nội dung cũ). Đọc bản cũ + đánh số phiên bản + ghi đều trong MỘT
     * transaction; @@unique(planId, versionNumber) chặn trùng số khi hai lần sửa chạy song song.
     * `violations` (nếu có) thay kết quả chấm lưu kèm giáo án sau khi AI viết lại.
     */
    async updateSection(id: string, section: EditableSection, value: unknown, userId: string, description: string, violations?: Violation[]): Promise<PlanRecord> {
      const row = await db.$transaction(async (tx) => {
        const before = await tx.lessonPlan.findUniqueOrThrow({ where: { id } });
        const last = await tx.planVersion.findFirst({ where: { planId: id }, orderBy: { versionNumber: "desc" }, select: { versionNumber: true } });
        await tx.planVersion.create({
          data: {
            planId: id,
            versionNumber: (last?.versionNumber ?? 0) + 1,
            editedBy: userId,
            sectionEdited: section,
            changeDescription: description.slice(0, 500),
            contentSnapshot: JSON.stringify(before[section] ?? null),
          },
        });
        return tx.lessonPlan.update({ where: { id }, data: { [section]: value as never, ...(violations && { guardViolations: violations as never }) } });
      });
      return toPlanRecord(row);
    },

    async setObservationCriteria(id: string, criteria: string[]) {
      await db.lessonPlan.update({ where: { id }, data: { observationCriteria: criteria } });
    },

    listVersions(planId: string) {
      return db.planVersion.findMany({ where: { planId }, orderBy: { versionNumber: "asc" } });
    },
  };
}
