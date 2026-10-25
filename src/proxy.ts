import { NextResponse, type NextRequest } from "next/server";
import { inspectRequest, securityHeaders } from "@/server/security/request-guard";
import { getSessionSecret, verifySession } from "@/server/session-token";

const SESSION_COOKIE = "sg_session";

/**
 * Lớp 1 của pipeline bảo mật: lọc mọi request trước khi tới route/page.
 * Lớp 2 (src/server/http.ts): phiên + vai trò đối chiếu DB, rate limit, đọc body có giới hạn, Zod strict.
 * Lớp 3 (services): phân quyền theo lớp/trường/chủ sở hữu và luật nghiệp vụ.
 * Lớp 4 (ranh giới AI): rào dữ liệu không tin cậy trong prompt, tiêu chí đánh giá đầu ra, xác nhận của người thật.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const dev = process.env.NODE_ENV !== "production";
  const isApi = pathname.startsWith("/api/");

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const verdict = inspectRequest({
    method: request.method,
    rawUrl: request.url,
    pathname,
    headers: request.headers,
    expectedHost: host,
    sessionValid: Boolean(token && verifySession(token, getSessionSecret())),
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean),
  });

  let response: NextResponse;
  if (verdict.action === "reject") {
    response = NextResponse.json({ error: { code: verdict.code, message: verdict.message } }, { status: verdict.status });
  } else if (verdict.action === "redirect") {
    response = NextResponse.redirect(new URL(verdict.to, request.url));
    if (token) response.cookies.delete(SESSION_COOKIE); // cookie hỏng/hết hạn: dọn luôn
  } else {
    response = NextResponse.next();
  }

  for (const [k, v] of Object.entries(securityHeaders({ dev, isApi }))) response.headers.set(k, v);

  if (!request.cookies.has("sg_device_id")) {
    response.cookies.set("sg_device_id", crypto.randomUUID(), {
      path: "/",
      maxAge: 365 * 24 * 3600,
      sameSite: "lax",
      httpOnly: false,
    });
  }

  return response;
}

export const config = {
  // bỏ qua tài nguyên tĩnh đã build và ảnh tối ưu
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)"],
};
