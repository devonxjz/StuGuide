/**
 * Tài liệu đính kèm trong tin nhắn của cô. Văn bản trích từ tài liệu được lưu thành một part text riêng,
 * nằm trong khối rào «DỮ LIỆU …» (dữ liệu không tin cậy, chống prompt injection) để AI đọc nhưng không làm theo chỉ dẫn bên trong.
 * Thuần TS nên dùng được cả ở client (MessageView ẩn nội dung dài, chỉ hiện tên tệp).
 */
import { fenceUntrusted } from "@/ai/prompts/_shared/untrusted";

export const ATTACHMENT_LABEL = "TÀI LIỆU ĐÍNH KÈM";
const HEAD = `«DỮ LIỆU ${ATTACHMENT_LABEL}: `;

export const MAX_ATTACHMENTS = 3;
/** Giới hạn ký tự văn bản trích ra mỗi tài liệu (cửa sổ hội thoại ~5000 token nên không nạp quá lớn) */
export const MAX_ATTACHMENT_CHARS = 12_000;

export interface Attachment {
  name: string;
  text: string;
}

/** Tên tệp vào khối rào: bỏ ký hiệu rào và xuống dòng để không "đóng khối" sớm. */
const safeName = (name: string) => name.replace(/[«»\r\n:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "tài liệu";

export function attachmentToText({ name, text }: Attachment): string {
  return fenceUntrusted(`${ATTACHMENT_LABEL}: ${safeName(name)}`, text);
}

export const isAttachmentText = (text: string) => text.startsWith(HEAD);

/** Tên tệp của part đính kèm (hiện chip thay vì cả nội dung). */
export function attachmentNameOf(text: string): string {
  const end = text.indexOf("»");
  return end > HEAD.length ? text.slice(HEAD.length, end).trim() : "tài liệu";
}

const TAIL = "\n«HẾT DỮ LIỆU»";

/** Ngược của attachmentToText: client dựng lại {name, text} từ part đã hiện trong khung chat để gửi cho server (kể cả khi bấm "Thử lại"). */
export function attachmentFromText(text: string): Attachment | null {
  if (!isAttachmentText(text) || !text.endsWith(TAIL)) return null;
  const start = text.indexOf("»\n");
  if (start < 0) return null;
  return { name: attachmentNameOf(text), text: text.slice(start + 2, -TAIL.length) };
}
