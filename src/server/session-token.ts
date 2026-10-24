import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token phiên không trạng thái: "v2.<payload base64url>.<hmac>".
 * - `sub`: id người dùng, `sv`: phiên bản phiên (tăng khi đăng xuất → mọi token cũ mất hiệu lực), `exp`: hết hạn (giây).
 * - Chữ ký HMAC-SHA256 phủ cả tiền tố phiên bản lẫn payload, so sánh thời gian hằng.
 * Thuần Node crypto nên dùng được ở cả proxy (lớp lọc đầu tiên) và route handler.
 */
export interface SessionClaims {
  sub: string;
  sv: number;
  exp: number;
}

const VERSION = "v2";
/** Thời gian sống của phiên: 12 giờ (một ngày làm việc). */
export const SESSION_TTL_SECONDS = 12 * 60 * 60;
const MAX_TOKEN_LENGTH = 512;
const SUBJECT = /^[A-Za-z0-9_-]{1,64}$/;

const mac = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url");

export function signSession(claims: { sub: string; sv?: number; exp?: number }, secret: string, now = Date.now()): string {
  if (!SUBJECT.test(claims.sub)) throw new Error("Id người dùng không hợp lệ cho phiên đăng nhập");
  const payload: SessionClaims = { sub: claims.sub, sv: claims.sv ?? 0, exp: claims.exp ?? Math.floor(now / 1000) + SESSION_TTL_SECONDS };
  const body = `${VERSION}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
  return `${body}.${mac(body, secret)}`;
}

export function verifySession(token: string | undefined, secret: string, now = Date.now()): SessionClaims | null {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== VERSION) return null;

  const body = `${parts[0]}.${parts[1]}`;
  const given = Buffer.from(parts[2]);
  const expected = Buffer.from(mac(body, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const c = claims as Partial<SessionClaims>;
  if (typeof c.sub !== "string" || !SUBJECT.test(c.sub)) return null;
  if (!Number.isInteger(c.sv) || (c.sv as number) < 0) return null;
  if (!Number.isInteger(c.exp) || (c.exp as number) * 1000 <= now) return null;
  return { sub: c.sub, sv: c.sv as number, exp: c.exp as number };
}

/**
 * Khóa ký phiên. Không có giá trị mặc định: thiếu hoặc quá ngắn thì báo lỗi rõ ràng
 * (giá trị mặc định nằm trong mã nguồn = ai cũng giả mạo được cookie).
 */
export function getSessionSecret(env: Record<string, string | undefined> = process.env): string {
  const secret = env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('Thiếu SESSION_SECRET (tối thiểu 32 ký tự). Tạo bằng: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))" rồi đặt vào .env.local');
  }
  return secret;
}
