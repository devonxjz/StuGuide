import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/core/errors";
import { clientIp, route, tooMany } from "@/server/http";
import { verifyPassword } from "@/server/password";
import { getRateLimiter, RATE_RULES } from "@/server/security/rate-limit";
import { sessionCookie } from "@/server/session";

const bodySchema = z.strictObject({
  /** Email (giáo viên, ban giám hiệu) hoặc số điện thoại (phụ huynh) */
  username: z.string({ error: "Vui lòng nhập email hoặc số điện thoại" }).trim().min(3, "Vui lòng nhập email hoặc số điện thoại").max(254, "Tài khoản không hợp lệ"),
  password: z.string({ error: "Vui lòng nhập mật khẩu" }).min(1, "Vui lòng nhập mật khẩu").max(128, "Mật khẩu tối đa 128 ký tự"),
});

const REDIRECT = { teacher: "/teacher", principal: "/principal", parent: "/family" } as const;
const INVALID = "Tài khoản hoặc mật khẩu chưa đúng";

/** Định danh tài khoản trong nhật ký/rate limit: băm một chiều, không lưu chuỗi người dùng gõ (có thể là mật khẩu gõ nhầm ô). */
const accountKey = (id: string) => createHash("sha256").update(id).digest("hex").slice(0, 16);

/**
 * Đăng nhập bằng mật khẩu cho cả 3 vai trò.
 * - Thông điệp lỗi và thời gian xử lý như nhau dù tài khoản có tồn tại hay không.
 * - Giới hạn theo IP và theo tài khoản (khóa tạm sau 5 lần sai / 15 phút), đăng nhập đúng thì xóa bộ đếm của tài khoản.
 */
export const POST = route({ auth: "public", body: bodySchema, rateLimit: "login-ip" }, async ({ req, body, c }) => {
  const isEmail = body.username.includes("@");
  const id = isEmail ? body.username.toLowerCase() : body.username.replace(/[\s.-]/g, "");
  const key = `login-account:${accountKey(id)}`;
  const limiter = getRateLimiter();

  const locked = limiter.peek(key, RATE_RULES["login-account"]);
  if (!locked.ok) {
    await c.repos.audit.log({ userId: null, action: "login_locked", details: `Tạm khóa đăng nhập tài khoản #${accountKey(id)} (IP ${clientIp(req)})` });
    return tooMany(locked.retryAfter);
  }

  const user = isEmail ? await c.repos.users.findByEmail(id) : await c.repos.users.findByPhone(id);
  const ok = await verifyPassword(body.password, user?.passwordHash);
  if (!user || !ok) {
    limiter.hit(key, RATE_RULES["login-account"]);
    await c.repos.audit.log({ userId: user?.id ?? null, action: "login_failed", details: `Đăng nhập thất bại (${isEmail ? "email" : "số điện thoại"} #${accountKey(id)})` });
    throw new AppError("ERR-AUTH-01", INVALID, 401);
  }

  limiter.reset(key);
  await c.repos.audit.log({ userId: user.id, action: "login", details: `Đăng nhập bằng mật khẩu (${user.role})` });
  const cookie = sessionCookie(user.id, user.sessionVersion);
  const res = NextResponse.json({ redirect: REDIRECT[user.role as keyof typeof REDIRECT] });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
});
