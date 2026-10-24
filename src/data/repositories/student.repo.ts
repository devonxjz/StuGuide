import type { Db } from "../prisma";

export function createStudentRepo(db: Db) {
  return {
    listByClass: (classId: string) => db.student.findMany({ where: { classId }, orderBy: { fullName: "asc" } }),
    findById: (id: string) => db.student.findUnique({ where: { id }, include: { class: true } }),
    async studentIdsOfParent(parentId: string): Promise<string[]> {
      const links = await db.studentParent.findMany({ where: { parentId } });
      return links.map((l) => l.studentId);
    },
    setProfileSharing: (id: string, shared: boolean, parentId: string) =>
      db.student.update({ where: { id }, data: { profileSharedWithTeacher: shared, profileSharedAt: shared ? new Date() : null, profileSharedBy: shared ? parentId : null } }),
    childrenOfParent: (parentId: string) =>
      db.student.findMany({ where: { parents: { some: { parentId } } }, include: { class: true }, orderBy: { fullName: "asc" } }),
    /** Đánh giá của CHÍNH bé này, kèm mảng phát triển của bài học (cho tiến bộ theo mảng) */
    assessmentsOfStudent: (studentId: string) =>
      db.studentAssessment.findMany({
        where: { studentId, checklist: { savedAt: { not: null } } },
        include: { checklist: { include: { lessonPlan: true } } },
        orderBy: { checklist: { date: "desc" } },
      }),
    parentLinks: (classId: string) =>
      db.studentParent.findMany({ where: { student: { classId } }, select: { studentId: true, parentId: true } }),
  };
}
