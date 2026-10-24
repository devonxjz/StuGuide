import type { Db } from "../prisma";
import type { AssessmentEntry } from "@/core/schemas/assessment.schema";
import type { AssessmentRating } from "@/core/constants/status";

export interface HistoryPoint {
  date: Date;
  rating: AssessmentRating;
  note: string | null;
}

export function createAssessmentRepo(db: Db) {
  return {
    createChecklist: (lessonPlanId: string, classId: string, criteria: string[], date = new Date()) =>
      db.observationChecklist.create({ data: { lessonPlanId, classId, criteria, date } }),

    findChecklistById: (id: string) =>
      db.observationChecklist.findUnique({ where: { id }, include: { assessments: true, lessonPlan: true } }),

    findChecklistByPlan: (lessonPlanId: string) =>
      db.observationChecklist.findFirst({
        where: { lessonPlanId },
        orderBy: { date: "desc" },
        include: { assessments: true },
      }),

    async saveAssessments(checklistId: string, entries: AssessmentEntry[]) {
      await db.$transaction([
        ...entries.map((e) =>
          db.studentAssessment.upsert({
            where: { checklistId_studentId: { checklistId, studentId: e.studentId } },
            create: { checklistId, studentId: e.studentId, overallRating: e.overallRating, ratings: e.ratings, note: e.note ?? null },
            update: { overallRating: e.overallRating, ratings: e.ratings, note: e.note ?? null },
          }),
        ),
        db.observationChecklist.update({ where: { id: checklistId }, data: { savedAt: new Date() } }),
      ]);
    },

    /** Lịch sử đánh giá tổng quát của từng bé (mới → cũ) để dò chuỗi tuần. */
    async historyByStudent(classId: string): Promise<Map<string, HistoryPoint[]>> {
      const rows = await db.studentAssessment.findMany({
        where: { checklist: { classId, savedAt: { not: null } } },
        include: { checklist: true },
        orderBy: { checklist: { date: "desc" } },
      });
      const map = new Map<string, HistoryPoint[]>();
      for (const r of rows) {
        const list = map.get(r.studentId) ?? [];
        list.push({ date: r.checklist.date, rating: r.overallRating as AssessmentRating, note: r.note });
        map.set(r.studentId, list);
      }
      return map;
    },

    async createAlert(data: { studentId: string; pattern: string; weekCount: number; skillArea: string; suggestedActivity: string }) {
      await db.behavioralAlert.deleteMany({ where: { studentId: data.studentId } });
      return db.behavioralAlert.create({ data });
    },

    clearAlert: (studentId: string) => db.behavioralAlert.deleteMany({ where: { studentId } }),

    listAlerts: (classId: string) =>
      db.behavioralAlert.findMany({
        where: { student: { classId } },
        include: { student: true },
        orderBy: { createdAt: "desc" },
      }),
  };
}
