import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Xác thực lời gọi cron theo chuẩn Vercel: header `Authorization: Bearer <CRON_SECRET>`.
 * So sánh hằng thời gian (qua hash cùng độ dài). Thiếu secret cấu hình thì luôn từ chối.
 */
export function isCronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization) return false;
  const match = /^Bearer (.+)$/.exec(authorization);
  return match !== null && timingSafeEqual(digest(match[1]), digest(secret));
}
