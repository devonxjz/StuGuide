import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Định danh thiết bị cho quota AI, do SERVER cấp trong cookie HttpOnly dạng "<id>.<chữ ký HMAC>".
 * Client không đọc được và không tự tạo được giá trị hợp lệ; header x-device-id hay cookie không có chữ ký đều bị bỏ qua.
 * Xóa cookie chỉ nhận được thiết bị mới, nên quota luôn đi kèm trần theo mạng (ai-quota.ts).
 */

// ── 1. Cấu hình cookie ──────────────────────────────────────────────────────

export const DEVICE_COOKIE = "sg_device";
/** Cookie của cơ chế cũ (client tự đặt id / quota ký trong cookie): proxy xóa đi khi gặp. */
export const LEGACY_DEVICE_COOKIES = ["sg_device_id", "sg_device_quota"] as const;

export const deviceCookieOptions = (dev: boolean) => ({
  path: "/",
  maxAge: 365 * 24 * 3600,
  sameSite: "lax" as const,
  httpOnly: true,
  secure: !dev,
});

// ── 2. Ký và cấp id ─────────────────────────────────────────────────────────

/** 16 byte ngẫu nhiên ở dạng base64url luôn dài đúng 22 ký tự */
const DEVICE_ID = /^[A-Za-z0-9_-]{22}$/;
const MAX_TOKEN_LENGTH = 128;

const sign = (id: string, secret: string) => createHmac("sha256", secret).update(`device:${id}`).digest("base64url");

export function issueDeviceToken(secret: string): string {
  const id = randomBytes(16).toString("base64url");
  return `${id}.${sign(id, secret)}`;
}

// ── 3. Kiểm tra id client gửi lên ───────────────────────────────────────────

/** Trả về id thiết bị khi token đúng định dạng và đúng chữ ký; mọi trường hợp khác trả về null. */
export function verifyDeviceToken(token: string | undefined | null, secret: string): string | null {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [id, signature] = parts;
  if (!DEVICE_ID.test(id)) return null;

  const given = Buffer.from(signature);
  const expected = Buffer.from(sign(id, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return id;
}
