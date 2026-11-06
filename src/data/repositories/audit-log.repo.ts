import type { Db } from "../prisma";

export function createAuditLogRepo(db: Db) {
  return {
    log: (data: { userId?: string | null; action: string; target?: string; details?: string }) =>
      db.auditLog.create({ data: { ...data, userId: data.userId ?? null, target: data.target ?? null, details: data.details ?? null } }),
    /** Sự kiện cùng loại + đối tượng đã ghi từ mốc `since` (dùng chống gửi trùng). */
    findRecent: (action: string, target: string, since: Date) =>
      db.auditLog.findFirst({ where: { action, target, timestamp: { gte: since } }, orderBy: { timestamp: "desc" } }),
    list: (limit = 20) =>
      db.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: limit, include: { user: true } }),
    /** Nhật ký của tài khoản thuộc một trường (BGH chỉ thấy trường mình; sự kiện không xác định được người dùng không hiển thị). */
    listBySchool: (schoolId: string, limit = 20) =>
      db.auditLog.findMany({ where: { user: { schoolId } }, orderBy: { timestamp: "desc" }, take: Math.min(limit, 200), include: { user: true } }),
  };
}
