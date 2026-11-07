import { z } from "zod";
import { AGE_GROUP_VALUES } from "../constants/age-groups";
import { ROSTER_MAX_ROWS } from "../roster-import";
import { lineText } from "./common.schema";

const rosterRowSchema = z.strictObject({
  studentName: lineText(80),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh không hợp lệ"),
  gender: z.enum(["Nam", "Nữ"]),
  parentName: lineText(80),
  parentPhone: z.string().trim().regex(/^\+?\d{8,15}$/, "Số điện thoại không hợp lệ").optional(),
  parentEmail: z.string().trim().toLowerCase().email("Email không hợp lệ").max(254).optional(),
});

/** Cô bấm "Thêm lớp": tên lớp, nhóm tuổi và danh sách bé + phụ huynh đã đọc từ CSV/Excel (có thể để trống rồi thêm sau). */
export const createClassBodySchema = z.strictObject({
  name: lineText(60, "Vui lòng nhập tên lớp"),
  ageGroup: z.enum(AGE_GROUP_VALUES),
  rows: z.array(rosterRowSchema).max(ROSTER_MAX_ROWS).default([]),
});
export type CreateClassBody = z.infer<typeof createClassBodySchema>;

export interface CreateClassResult {
  classId: string;
  className: string;
  students: number;
  parents: number;
  /** Dòng bị bỏ qua kèm lý do (trùng bé, trùng email/số điện thoại của tài khoản khác…) */
  problems: string[];
}
