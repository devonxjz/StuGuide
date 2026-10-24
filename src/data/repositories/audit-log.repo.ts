import type { Db } from "../prisma";

export function createAuditLogRepo(db: Db) {
  return {
    log: (data: { userId?: string | null; action: string; target?: string; details?: string }) =>
      db.auditLog.create({ data: { ...data, userId: data.userId ?? null, target: data.target ?? null, details: data.details ?? null } }),
    list: (limit = 20) =>
      db.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: limit, include: { user: true } }),
    /** Nhật ký của tài khoản thuộc một trường (BGH chỉ thấy trường mình; sự kiện không xác định được người dùng không hiển thị). */
    listBySchool: (schoolId: string, limit = 20) =>
      db.auditLog.findMany({ where: { user: { schoolId } }, orderBy: { timestamp: "desc" }, take: Math.min(limit, 200), include: { user: true } }),
  };
}
