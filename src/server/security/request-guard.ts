/**
 * Lớp lọc thứ nhất (chạy trong proxy, trước khi request chạm vào app). Hàm thuần, không đụng DB:
 * chặn đường dẫn bất thường, phương thức lạ, CSRF (Origin/Sec-Fetch-Site), body quá lớn hoặc sai kiểu,
 * và từ chối sớm request chưa đăng nhập vào khu vực cần đăng nhập.
 * Route handler vẫn kiểm tra lại đầy đủ (phòng thủ nhiều lớp – proxy có thể bị cấu hình sai matcher).
 */

export type GuardVerdict =
  | { action: "next" }
  | { action: "reject"; status: number; code: string; message: string }
  | { action: "redirect"; to: string };

export interface RequestFacts {
  method: string;
  /** URL thô (chưa giải mã) để bắt các biến thể mã hóa của "../" và byte NUL */
  rawUrl: string;
  pathname: string;
  headers: Headers;
  /** Host mà máy chủ đang phục vụ (đã tính x-forwarded-host) */
  expectedHost: string;
  /** Cookie phiên có chữ ký hợp lệ và còn hạn (chưa đối chiếu DB) */
  sessionValid: boolean;
  allowedOrigins?: string[];
}

const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "PATCH", "DELETE"]);
const MUTATING = new Set(["POST", "PATCH", "DELETE"]);

/** API không cần phiên: đăng nhập/đăng xuất, quota thiết bị, liên kết riêng của phụ huynh (token trong URL) và cron (tự xác thực bằng CRON_SECRET trong route). */
const PUBLIC_API = [/^\/api\/auth\/(login|logout)$/, /^\/api\/device\/quota$/, /^\/api\/parent\/[A-Za-z0-9_-]{1,64}$/, /^\/api\/feedback$/, /^\/api\/v1\/cron\/model-health$/];
const PROTECTED_PAGES = /^\/(teacher|principal|family)(\/|$)/;

/** Giới hạn body theo route (byte). Phiên học ở nhà chứa tới 500 sự kiện + 60 lượt hội thoại. */
const BODY_LIMITS: [RegExp, number][] = [
  [/^\/api\/family\/sessions$/, 1024 * 1024],
  [/^\/api\/(chat|family\/chat)$/, 512 * 1024],
];
export const DEFAULT_BODY_LIMIT = 64 * 1024;

export const bodyLimitFor = (pathname: string) => BODY_LIMITS.find(([re]) => re.test(pathname))?.[1] ?? DEFAULT_BODY_LIMIT;
export const isPublicApi = (pathname: string) => PUBLIC_API.some((re) => re.test(pathname));

const reject = (status: number, code: string, message: string): GuardVerdict => ({ action: "reject", status, code, message });

const SUSPICIOUS_URL = /(%2e%2e|\.\.[/\\]|[/\\]\.\.|%00|\\|%5c|%2f%2f)/i;

export function inspectRequest(f: RequestFacts): GuardVerdict {
  const method = f.method.toUpperCase();

  // 1) Đường dẫn: dài bất thường, path traversal, byte NUL, backslash
  if (f.rawUrl.length > 2048 || SUSPICIOUS_URL.test(f.rawUrl)) return reject(400, "ERR-INPUT-01", "Đường dẫn không hợp lệ");

  // 2) Phương thức
  if (!ALLOWED_METHODS.has(method)) return reject(405, "ERR-METHOD-01", "Phương thức không được hỗ trợ");

  const isApi = f.pathname.startsWith("/api/");

  if (isApi && MUTATING.has(method)) {
    // 3) CSRF: trình duyệt luôn gửi Origin cho request ghi khác nguồn; Sec-Fetch-Site là lớp dự phòng
    const origin = f.headers.get("origin");
    if (origin) {
      let host: string;
      try {
        host = new URL(origin).host;
      } catch {
        return reject(403, "ERR-CSRF-01", "Nguồn yêu cầu không hợp lệ");
      }
      const allowed = host === f.expectedHost || (f.allowedOrigins ?? []).includes(origin);
      if (!allowed) return reject(403, "ERR-CSRF-01", "Yêu cầu từ trang khác bị chặn");
    } else {
      const site = f.headers.get("sec-fetch-site");
      if (site && site !== "same-origin" && site !== "none") return reject(403, "ERR-CSRF-01", "Yêu cầu từ trang khác bị chặn");
    }

    // 4) Kích thước + kiểu nội dung (route vẫn đếm byte thực tế khi đọc body)
    const length = Number(f.headers.get("content-length") ?? "0");
    if (!Number.isFinite(length) || length < 0) return reject(400, "ERR-INPUT-01", "Content-Length không hợp lệ");
    if (length > bodyLimitFor(f.pathname)) return reject(413, "ERR-INPUT-413", "Dữ liệu gửi lên quá lớn");
    const hasBody = length > 0 || f.headers.has("transfer-encoding");
    const type = f.headers.get("content-type") ?? "";
    if (hasBody && !/^application\/json\b/i.test(type)) return reject(415, "ERR-INPUT-01", "Chỉ chấp nhận dữ liệu dạng application/json");
  }

  // 5) Xác thực sớm (chỉ chữ ký + hạn dùng; route đối chiếu DB)
  if (isApi && !isPublicApi(f.pathname) && !f.sessionValid) return reject(401, "ERR-AUTH-01", "Vui lòng đăng nhập");
  if (!isApi && PROTECTED_PAGES.test(f.pathname) && !f.sessionValid) return { action: "redirect", to: "/login" };

  return { action: "next" };
}

/** Header bảo mật cho mọi phản hồi. Dev cần 'unsafe-eval' + websocket cho HMR của Next. */
export function securityHeaders({ dev, isApi }: { dev: boolean; isApi: boolean }): Record<string, string> {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  return {
    "Content-Security-Policy": csp,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    // link phụ huynh chứa token trong URL: không để lộ qua Referer sang trang ngoài
    "Referrer-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    ...(dev ? {} : { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" }),
    // dữ liệu cá nhân của trẻ: không để trình duyệt/proxy trung gian lưu cache
    ...(isApi ? { "Cache-Control": "no-store" } : {}),
  };
}
