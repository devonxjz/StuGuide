import type { Db } from "../prisma";
import type { Role } from "@/core/constants/status";

export function createUserRepo(db: Db) {
  return {
    findById: (id: string) => db.user.findUnique({ where: { id } }),
    findByEmail: (email: string) => db.user.findUnique({ where: { email } }),
    findByPhone: (phone: string) => db.user.findUnique({ where: { phone } }),
    findFirstByRole: (role: Role) => db.user.findFirst({ where: { role }, orderBy: { createdAt: "asc" } }),
    classOfTeacher: (teacherId: string) =>
      db.class.findFirst({ where: { teachers: { some: { teacherId } } }, orderBy: { name: "asc" } }),
    classesOfSchool: (schoolId: string) => db.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    async primaryTeacherOfClass(classId: string) {
      const link = await db.classTeacher.findFirst({ where: { classId }, orderBy: { isPrimary: "desc" }, include: { teacher: true } });
      return link?.teacher ?? null;
    },
    countTeachers: (schoolId: string) => db.user.count({ where: { schoolId, role: "teacher" } }),
    schoolName: async (schoolId: string) => (await db.school.findUnique({ where: { id: schoolId } }))?.name ?? null,
    findClass: (id: string) => db.class.findUnique({ where: { id } }),
    /** Thu hồi mọi phiên đã cấp cho tài khoản (đăng xuất). */
    revokeSessions: (id: string) => db.user.update({ where: { id }, data: { sessionVersion: { increment: 1 } } }),
  };
}
