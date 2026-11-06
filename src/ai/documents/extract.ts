import { MAX_ATTACHMENT_CHARS } from "@/lib/attachments";

/** Trích văn bản từ tài liệu cô tải lên để AI đọc. Không gọi AI; chỉ phân tích tệp trên server. */

export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PLAIN = new Set(["text/plain", "text/markdown", "text/csv", "application/json"]);
const PLAIN_EXT = /\.(txt|md|markdown|csv|json)$/i;

export type DocumentKind = "pdf" | "docx" | "text";

export class UnsupportedDocumentError extends Error {}
export class EmptyDocumentError extends Error {}

/** Nhận diện theo MIME, dự phòng theo đuôi tệp (trình duyệt đôi khi gửi MIME rỗng). */
export function detectKind(name: string, type: string): DocumentKind {
  if (type === "application/pdf" || (!type && /\.pdf$/i.test(name))) return "pdf";
  if (type === DOCX || /\.docx$/i.test(name)) return "docx";
  if (PLAIN.has(type) || PLAIN_EXT.test(name) || type.startsWith("text/")) return "text";
  throw new UnsupportedDocumentError("Chỉ hỗ trợ tệp PDF, Word (.docx), văn bản (.txt, .md, .csv)");
}

const tidy = (s: string) =>
  s
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

async function readPdf(bytes: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function readDocx(bytes: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: bytes });
  return value;
}

export interface ExtractedDocument {
  text: string;
  /** Văn bản dài hơn giới hạn nên đã bị cắt */
  truncated: boolean;
  totalChars: number;
}

export async function extractDocumentText(file: { name: string; type: string; bytes: Buffer }, maxChars = MAX_ATTACHMENT_CHARS): Promise<ExtractedDocument> {
  const kind = detectKind(file.name, file.type);
  let raw: string;
  try {
    raw = kind === "pdf" ? await readPdf(file.bytes) : kind === "docx" ? await readDocx(file.bytes) : file.bytes.toString("utf8");
  } catch {
    throw new UnsupportedDocumentError("Không đọc được tệp này (có thể đã hỏng hoặc đặt mật khẩu)");
  }
  const text = tidy(raw.normalize("NFC"));
  if (!text) throw new EmptyDocumentError("Tệp không có văn bản đọc được (có thể là ảnh quét)");
  return { text: text.slice(0, maxChars), truncated: text.length > maxChars, totalChars: text.length };
}
