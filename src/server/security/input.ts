import { InputError } from "@/core/errors";

export { InputError };

/**
 * Lớp lọc đầu vào thứ hai (sau proxy): đọc body có giới hạn kích thước, chặn JSON độc hại về cấu trúc
 * và chuẩn hóa mọi chuỗi trước khi tới Zod schema của từng route.
 */

/** Mặc định 64 KB; route cần nhiều hơn (phiên học ở nhà, chat) khai báo riêng. */
export const DEFAULT_MAX_BODY_BYTES = 64 * 1024;
/** Phần đệm của multipart (ranh giới, tên trường) ngoài nội dung tệp */
const MULTIPART_OVERHEAD = 4 * 1024;
const MAX_DEPTH = 8;
const MAX_KEYS = 200;
const MAX_ARRAY = 1000;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// C0/C1 control (trừ \t \n \r), zero-width, BOM, ký tự điều khiển hướng chữ (bidi override – dùng để đánh lừa người đọc).
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

/** Chuẩn hóa một chuỗi: Unicode NFC (tiếng Việt có dấu gõ từ nhiều bàn phím) + bỏ ký tự vô hình/điều khiển. */
export const cleanString = (s: string) => s.normalize("NFC").replace(INVISIBLE, "");

/** Duyệt toàn bộ giá trị JSON: chuẩn hóa chuỗi, chặn độ sâu/số khóa/độ dài mảng bất thường và khóa gây prototype pollution. */
export function normalizeInput(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) throw new InputError("Dữ liệu lồng nhau quá sâu");
  if (typeof value === "string") return cleanString(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new InputError("Số không hợp lệ");
    return value;
  }
  if (value === null || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY) throw new InputError("Danh sách quá dài");
    return value.map((v) => normalizeInput(v, depth + 1));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > MAX_KEYS) throw new InputError("Quá nhiều trường dữ liệu");
    const out: Record<string, unknown> = Object.create(null);
    for (const [k, v] of entries) {
      if (FORBIDDEN_KEYS.has(k)) throw new InputError(`Tên trường không được phép: "${k}"`);
      out[cleanString(k)] = normalizeInput(v, depth + 1);
    }
    // trả về object thường (Zod cần prototype chuẩn), khóa nguy hiểm đã bị loại
    return { ...out };
  }
  throw new InputError("Kiểu dữ liệu không được hỗ trợ");
}

/** Đọc body JSON với giới hạn byte thực tế (không tin Content-Length), rồi chuẩn hóa. */
export async function readJsonBody(req: Request, maxBytes = DEFAULT_MAX_BODY_BYTES): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new InputError("Dữ liệu gửi lên quá lớn", 413);

  const type = req.headers.get("content-type") ?? "";
  const raw = await readLimited(req, maxBytes);
  if (raw.length === 0) return undefined;
  if (!/^application\/json\b/i.test(type)) throw new InputError("Chỉ chấp nhận dữ liệu dạng application/json", 415);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InputError("Dữ liệu gửi lên không phải JSON hợp lệ");
  }
  return normalizeInput(parsed);
}

async function readLimitedBytes(req: Request, maxBytes: number): Promise<Buffer> {
  if (!req.body) return Buffer.alloc(0);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new InputError("Dữ liệu gửi lên quá lớn", 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function readLimited(req: Request, maxBytes: number): Promise<string> {
  return new TextDecoder("utf-8", { fatal: false }).decode(await readLimitedBytes(req, maxBytes));
}

export interface UploadedFile {
  name: string;
  /** MIME do client khai báo, đã bỏ phần tham số (vd. "audio/webm;codecs=opus" → "audio/webm") */
  type: string;
  bytes: Buffer;
}

/** Đọc một tệp tải lên (multipart/form-data, trường `file`) với giới hạn byte thực tế. */
export async function readUploadedFile(req: Request, maxBytes: number): Promise<UploadedFile> {
  if (!/^multipart\/form-data\b/i.test(req.headers.get("content-type") ?? "")) {
    throw new InputError("Chỉ chấp nhận tệp tải lên dạng multipart/form-data", 415);
  }
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes + MULTIPART_OVERHEAD) throw new InputError("Tệp quá lớn", 413);

  // Đọc có giới hạn rồi mới phân tích (không để formData() tự đọc không giới hạn)
  const raw = await readLimitedBytes(req, maxBytes + MULTIPART_OVERHEAD);
  let form: FormData;
  try {
    form = await new Response(new Uint8Array(raw), { headers: { "content-type": req.headers.get("content-type")! } }).formData();
  } catch {
    throw new InputError("Tệp tải lên không hợp lệ");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new InputError("Chưa chọn tệp");
  if (file.size > maxBytes) throw new InputError("Tệp quá lớn", 413);
  return { name: cleanString(file.name).slice(0, 120) || "tệp", type: file.type.split(";")[0].trim().toLowerCase(), bytes: Buffer.from(await file.arrayBuffer()) };
}
