import { z } from "zod";
import { idSchema, lineText, paragraph } from "./common.schema";

/** Giới hạn độ dài để thư không thể bị dùng làm kênh gửi thư rác hoặc tràn bộ nhớ. */
export const EMAIL_SUBJECT_MAX = 150;
export const EMAIL_BODY_MAX = 3000;

/** Ghi chú của cô về một bé trong buổi học (đưa vào lệnh gọi công cụ của trợ lý). */
export const emailNoteSchema = z.strictObject({
  student: lineText(80).describe("Tên bé đúng như trong danh sách lớp"),
  kind: z.enum(["good", "concern"]).describe("good: bé làm tốt/đáng khen; concern: điều cô thấy bất thường hoặc cần phụ huynh phối hợp"),
  note: paragraph(500).describe("Điều cô quan sát được, mô tả hành vi cụ thể"),
});
export type EmailNote = z.infer<typeof emailNoteSchema>;

/** Đầu ra của AI: mỗi bé một thư (chỉ chữ thuần, không HTML). */
export const generatedEmailsSchema = z.object({
  emails: z.array(
    z.object({
      studentId: idSchema,
      subject: lineText(EMAIL_SUBJECT_MAX).describe("Tiêu đề thư, nêu rõ lớp, ngày và tên bé"),
      body: paragraph(EMAIL_BODY_MAX).describe("Nội dung thư gửi phụ huynh của đúng bé này"),
    }),
  ),
});

/** Cô bấm Gửi: client chỉ gửi nội dung thư; địa chỉ nhận luôn được server tra lại từ dữ liệu lớp. */
export const sendEmailsBodySchema = z.strictObject({
  planId: idSchema.optional(),
  emails: z
    .array(z.strictObject({ studentId: idSchema, subject: lineText(EMAIL_SUBJECT_MAX), body: paragraph(EMAIL_BODY_MAX) }))
    .min(1, "Chưa chọn thư nào để gửi")
    .max(60),
});
export type SendEmailsBody = z.infer<typeof sendEmailsBodySchema>;

/** Danh bạ: cô dán/nhập "tên bé, email phụ huynh". */
export const importContactsBodySchema = z.strictObject({
  rows: z.array(z.strictObject({ studentName: lineText(80), email: z.string().trim().toLowerCase().email("Email không hợp lệ").max(254) })).min(1).max(200),
});
export type ImportContactsBody = z.infer<typeof importContactsBodySchema>;

/** Dữ liệu thư hiển thị trên thẻ chat và trang danh bạ (không chứa mật khẩu hay token). */
export interface EmailRecipient {
  parentId: string;
  parentName: string;
  /** null: phụ huynh chưa có email trong danh bạ */
  email: string | null;
}

export interface ParentEmailDraft {
  studentId: string;
  studentName: string;
  kind: "good" | "concern" | "none";
  recipients: EmailRecipient[];
  subject: string;
  body: string;
}

export type EmailSendStatus = "sent" | "duplicate" | "no_email" | "failed";

export interface EmailSendResult {
  studentId: string;
  studentName: string;
  status: EmailSendStatus;
  sentTo: string[];
  error?: string;
}

export interface ContactRow {
  studentId: string;
  studentName: string;
  parents: EmailRecipient[];
}
