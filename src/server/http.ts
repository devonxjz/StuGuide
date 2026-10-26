import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAppError, isZodError } from "@/core/errors";
import type { Role } from "@/core/constants/status";
import type { Actor } from "@/services/types";
import { getContainer, type Container } from "./container";
import { resolveSession, SESSION_COOKIE, type Session } from "./session";
import { readJsonBody } from "./security/input";
import {
  getRateLimiter,
  getDeviceQuotaLimiter,
  DEVICE_AI_LIMIT,
  DEVICE_COOKIE,
  DEVICE_QUOTA_COOKIE,
  signDeviceQuota,
  parseDeviceQuota,
  RATE_RULES,
  type RateBucket,
} from "./security/rate-limit";
import { bodyLimitFor } from "./security/request-guard";

// Thông điệp lỗi validation mặc định bằng tiếng Việt (schema nào có thông điệp riêng thì dùng thông điệp đó)
z.config(z.locales.vi());

/** "public": không cần phiên (vd. liên kết phụ huynh dùng token). Ngược lại: danh sách vai trò được phép – bắt buộc khai báo. */
type Auth = "public" | readonly Role[];
type Out<S> = S extends z.ZodType ? z.output<S> : undefined;

export interface RouteOptions<A extends Auth, PS, BS, QS> {
  auth: A;
  /** Schema cho tham số đường dẫn ([id], [token]…) */
  params?: PS;
  /** Schema cho body JSON (nên dùng z.strictObject để từ chối trường lạ) */
  body?: BS;
  /** Schema cho query string */
  query?: QS;
  /** Nhóm giới hạn tần suất; mặc định "read" cho GET, "write" cho thao tác ghi */
  rateLimit?: RateBucket;
}

export interface HandlerArgs<A extends Auth, PS, BS, QS> {
  req: NextRequest;
  c: Container;
  session: A extends "public" ? Session | null : Session;
  params: Out<PS>;
  body: Out<BS>;
  query: Out<QS>;
}

type RouteContext = { params: Promise<Record<string, string>> };

/**
 * Lớp 2 của pipeline bảo mật (sau proxy). Thứ tự cố định:
 * phiên (đối chiếu DB) → vai trò → rate limit → tham số đường dẫn → query → body (giới hạn byte, chuẩn hóa, Zod) → handler.
 * Lỗi nghiệp vụ được chuyển thành JSON có mã lỗi; lỗi lạ không lộ chi tiết ra ngoài.
 */
export function route<
  const A extends Auth,
  PS extends z.ZodType | undefined = undefined,
  BS extends z.ZodType | undefined = undefined,
  QS extends z.ZodType | undefined = undefined,
>(options: RouteOptions<A, PS, BS, QS>, fn: (args: HandlerArgs<A, PS, BS, QS>) => Promise<unknown>) {
  return async (req: NextRequest, ctx: RouteContext): Promise<Response> => {
    try {
      const c = await getContainer();
      const session = await resolveSession(req.cookies.get(SESSION_COOKIE)?.value);

      if (options.auth !== "public") {
        if (!session) return error(401, "ERR-AUTH-01", "Vui lòng đăng nhập");
        if (!(options.auth as readonly Role[]).includes(session.role)) {
          await c.repos.audit.log({ userId: session.id, action: "access_denied", target: req.nextUrl.pathname, details: `Vai trò ${session.role} gọi API không được phép` });
          return error(403, "ERR-AUTH-01", "Truy cập bị từ chối");
        }
      }

      const bucket = options.rateLimit ?? (req.method === "GET" || req.method === "HEAD" ? "read" : "write");
      const limited = getRateLimiter().hit(`${bucket}:${session?.id ?? clientIp(req)}`, RATE_RULES[bucket]);
      if (!limited.ok) return tooMany(limited.retryAfter);

      if (bucket === "ai") {
        const quotaCookie = getDeviceQuotaCookie(req);
        const deviceId = getDeviceId(req) || quotaCookie?.deviceId;
        if (deviceId) {
          const baseUsed = quotaCookie?.deviceId === deviceId ? quotaCookie.used : (quotaCookie?.used ?? 0);
          const currentQuota = getDeviceQuotaLimiter().getQuota(deviceId, baseUsed);
          if (currentQuota.isExceeded) return quotaExceeded(deviceId, currentQuota.used);
        }
      }

      const params = options.params ? options.params.parse((await ctx?.params) ?? {}) : undefined;
      const query = options.query ? options.query.parse(Object.fromEntries(req.nextUrl.searchParams)) : undefined;
      const body = options.body ? options.body.parse(await readJsonBody(req, bodyLimitFor(req.nextUrl.pathname))) : undefined;

      if (bucket === "ai") {
        const quotaCookie = getDeviceQuotaCookie(req);
        const deviceId = getDeviceId(req) || quotaCookie?.deviceId;
        if (deviceId) {
          const baseUsed = quotaCookie?.deviceId === deviceId ? quotaCookie.used : (quotaCookie?.used ?? 0);
          const quota = getDeviceQuotaLimiter().consume(deviceId, baseUsed);
          if (!quota.ok) return quotaExceeded(deviceId, quota.used);
        }
      }

      const out = await fn({ req, c, session: session as HandlerArgs<A, PS, BS, QS>["session"], params: params as Out<PS>, body: body as Out<BS>, query: query as Out<QS> });
      const res = out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
      if (bucket === "ai") {
        const quotaCookie = getDeviceQuotaCookie(req);
        const deviceId = getDeviceId(req) || quotaCookie?.deviceId;
        if (deviceId) {
          const quota = getDeviceQuotaLimiter().getQuota(deviceId);
          res.headers.set("X-Device-AI-Limit", String(quota.limit));
          res.headers.set("X-Device-AI-Remaining", String(quota.remaining));
          res.headers.set("X-Device-AI-Used", String(quota.used));

          if (!deviceId.startsWith("ip:")) {
            const signedToken = signDeviceQuota(deviceId, quota.used, quota.isExceeded);
            const cookieVal = `${DEVICE_QUOTA_COOKIE}=${signedToken}; Path=/; Max-Age=31536000; SameSite=Lax`;
            const idCookieVal = `${DEVICE_COOKIE}=${deviceId}; Path=/; Max-Age=31536000; SameSite=Lax`;

            if (res instanceof NextResponse) {
              res.cookies.set(DEVICE_COOKIE, deviceId, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
              res.cookies.set(DEVICE_QUOTA_COOKIE, signedToken, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
            } else {
              res.headers.append("Set-Cookie", idCookieVal);
              res.headers.append("Set-Cookie", cookieVal);
            }
          }
        }
      }
      return res;
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}

const error = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });

export const tooMany = (retryAfter: number) =>
  NextResponse.json(
    { error: { code: "ERR-RATE-01", message: `Thao tác quá nhanh, vui lòng thử lại sau ${retryAfter} giây` } },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );

export const quotaExceeded = (deviceId?: string, used = DEVICE_AI_LIMIT) => {
  const res = NextResponse.json(
    {
      error: {
        code: "ERR-QUOTA-EXCEEDED",
        message: "Quá hạn sử dụng, bạn phải mua thêm lượt",
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": "86400",
        "X-Device-AI-Limit": String(DEVICE_AI_LIMIT),
        "X-Device-AI-Remaining": "0",
        "X-Device-AI-Used": String(used),
      },
    },
  );
  if (deviceId && !deviceId.startsWith("ip:")) {
    const signedToken = signDeviceQuota(deviceId, used, true);
    res.cookies.set(DEVICE_COOKIE, deviceId, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
    res.cookies.set(DEVICE_QUOTA_COOKIE, signedToken, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
  }
  return res;
};

export { DEVICE_COOKIE, DEVICE_QUOTA_COOKIE };

/** Đọc token hạn mức thiết bị đã ký từ cookie sg_device_quota */
export function getDeviceQuotaCookie(req: Request): { deviceId: string; used: number; isExceeded: boolean } | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = /(?:^|;\s*)sg_device_quota=([^;]+)/.exec(cookieHeader);
  if (!match?.[1]) return null;
  return parseDeviceQuota(match[1]);
}

/** Định danh thiết bị qua header x-device-id, cookie sg_device_id hoặc IP của client */
export function getDeviceId(req: Request): string | null {
  const headerId = req.headers.get("x-device-id");
  if (headerId && /^[A-Za-z0-9_-]{8,64}$/.test(headerId)) return headerId;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = /(?:^|;\s*)sg_device_id=([^;]+)/.exec(cookieHeader);
  if (match?.[1] && /^[A-Za-z0-9_-]{8,64}$/.test(match[1])) return match[1];
  const quotaCookie = getDeviceQuotaCookie(req);
  if (quotaCookie?.deviceId && /^[A-Za-z0-9_-]{8,64}$/.test(quotaCookie.deviceId)) return quotaCookie.deviceId;
  if (process.env.NODE_ENV !== "test") {
    return `ip:${clientIp(req)}`;
  }
  return null;
}

/** IP của client (sau reverse proxy tin cậy). Chỉ dùng làm khóa rate limit, không dùng để phân quyền. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "local";
}

export function toErrorResponse(e: unknown): Response {
  if (isAppError(e)) return error(e.status, e.code, e.message);
  if (isZodError(e)) return error(400, "ERR-INPUT-01", [...new Set(e.issues.map((i) => i.message))].join("; "));
  console.error("[api]", e);
  return error(500, "ERR-INTERNAL", "Có lỗi xảy ra, vui lòng thử lại");
}

export const toActor = (s: Session): Actor => ({ id: s.id, role: s.role, classId: s.classId, schoolId: s.schoolId });

/**
 * Chạy việc nền SAU khi đã trả phản hồi (Next `after`: không bị cắt giữa chừng khi chạy serverless).
 * Ngoài phạm vi request của Next (vd. gọi handler trực tiếp trong test) thì chạy ngay ở nền.
 */
export function runAfterResponse(task: () => Promise<unknown>) {
  try {
    after(task);
  } catch {
    void task();
  }
}
