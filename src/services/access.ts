import { PermissionError } from "@/core/guardrails";
import { FlowError } from "@/core/errors";
import type { Repositories } from "@/data/repositories";
import type { Actor } from "./types";

const CLASS_DENIED = "Bạn chỉ có quyền thao tác trên lớp mình phụ trách";

/**
 * Lớp 3 của pipeline bảo mật: phân quyền theo dữ liệu (fail-closed).
 * - Giáo viên: chỉ lớp mình phụ trách.
 * - BGH: chỉ các lớp thuộc trường của mình (ranh giới tenant), không phải mọi lớp trong hệ thống.
 * - Phụ huynh: không thao tác trên lớp (chỉ trên con mình – xem child-profile.service).
 */
export async function assertClassAccess(repos: Pick<Repositories, "users">, actor: Actor, classId: string): Promise<void> {
  if (actor.role === "teacher") {
    if (actor.classId && actor.classId === classId) return;
    throw new PermissionError(CLASS_DENIED);
  }
  if (actor.role === "principal") {
    const cls = actor.schoolId ? await repos.users.findClass(classId) : null;
    if (cls && cls.schoolId === actor.schoolId) return;
    throw new PermissionError("Bạn chỉ có quyền với các lớp thuộc trường của mình");
  }
  throw new PermissionError(CLASS_DENIED);
}

/** Phụ huynh chỉ được xem/ghi dữ liệu của bé đã được nhà trường liên kết; BGH chỉ bé thuộc trường mình. */
export async function canAccessStudent(
  repos: Pick<Repositories, "students">,
  actor: Actor,
  student: { id: string; classId: string; class: { schoolId: string } },
): Promise<boolean> {
  if (actor.role === "principal") return Boolean(actor.schoolId) && student.class.schoolId === actor.schoolId;
  if (actor.role === "teacher") return Boolean(actor.classId) && student.classId === actor.classId;
  if (actor.role === "parent") return (await repos.students.studentIdsOfParent(actor.id)).includes(student.id);
  return false;
}

export function requireClass(actor: Actor): string {
  if (!actor.classId) throw new FlowError("Tài khoản chưa được phân công lớp");
  return actor.classId;
}
