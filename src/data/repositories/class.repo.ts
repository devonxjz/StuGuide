import type { Db } from "../prisma";

export interface NewParent {
  /** Khóa nội bộ để các bé cùng phụ huynh trỏ về một tài khoản */
  key: string;
  fullName: string;
  phone?: string;
  email?: string;
}

export interface NewStudent {
  fullName: string;
  dateOfBirth: Date;
  gender: string;
  /** key của phụ huynh mới, hoặc id phụ huynh đã có */
  parent: { key: string } | { existingId: string };
}

export interface ClassPlan {
  schoolId: string;
  teacherId: string;
  name: string;
  ageGroup: string;
  ageLabel: string;
  parents: NewParent[];
  students: NewStudent[];
}

export function createClassRepo(db: Db) {
  return {
    /** Tạo lớp + gán cô làm chủ nhiệm + bé + phụ huynh trong MỘT giao dịch: lỗi giữa chừng thì không để lại lớp dở dang. */
    createWithRoster: (plan: ClassPlan) =>
      db.$transaction(async (tx) => {
        const cls = await tx.class.create({
          data: { name: plan.name, ageGroup: plan.ageGroup, ageLabel: plan.ageLabel, schoolId: plan.schoolId, teachers: { create: { teacherId: plan.teacherId, isPrimary: true } } },
        });
        const parentIds = new Map<string, string>();
        for (const p of plan.parents) {
          const user = await tx.user.create({ data: { fullName: p.fullName, phone: p.phone, email: p.email, role: "parent", schoolId: plan.schoolId } });
          parentIds.set(p.key, user.id);
        }
        for (const s of plan.students) {
          const parentId = "existingId" in s.parent ? s.parent.existingId : parentIds.get(s.parent.key)!;
          await tx.student.create({
            data: { fullName: s.fullName, dateOfBirth: s.dateOfBirth, gender: s.gender, classId: cls.id, parents: { create: { parentId } } },
          });
        }
        return cls;
      }),

    /** Hồ sơ cả lớp (bé + phụ huynh + liên lạc) cho trợ lý tra cứu. */
    roster: (classId: string) =>
      db.student.findMany({
        where: { classId },
        orderBy: { fullName: "asc" },
        select: {
          id: true,
          fullName: true,
          dateOfBirth: true,
          gender: true,
          parents: { select: { parent: { select: { fullName: true, phone: true, email: true } } } },
        },
      }),
  };
}
