import type { Role } from "../constants/status";
import { AppError } from "../errors";

/** Ma trận RBAC (spec mục 13) + BR-006 (Nghị định 13: phụ huynh chỉ thấy con mình). */
export type Action =
  | "plan:read"
  | "plan:write"
  | "plan:approve"
  | "assessment:read"
  | "assessment:write"
  | "card:read"
  | "card:write"
  | "feedback:write"
  | "school:read-all"
  | "report:export"
  | "audit:read";

const MATRIX: Record<Role, readonly Action[]> = {
  teacher: ["plan:read", "plan:write", "plan:approve", "assessment:read", "assessment:write", "card:read", "card:write"],
  principal: ["plan:read", "plan:approve", "assessment:read", "card:read", "school:read-all", "report:export", "audit:read"],
  parent: ["feedback:write"],
};

/** ERR-AUTH-01 */
export class PermissionError extends AppError {
  constructor(message = "Truy cập bị từ chối") {
    super("ERR-AUTH-01", message, 403);
  }
}

export const can = (role: Role, action: Action) => MATRIX[role].includes(action);

export function assertCan(role: Role, action: Action) {
  if (!can(role, action)) throw new PermissionError(`Vai trò ${role} không có quyền ${action}`);
}

export function assertParentOwnsStudent(linkedStudentIds: string[], studentId: string) {
  if (!linkedStudentIds.includes(studentId)) {
    throw new PermissionError("Bạn chỉ có quyền xem thông tin của bé đã được nhà trường liên kết");
  }
}
