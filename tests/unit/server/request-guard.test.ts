import { describe, it, expect } from "vitest";
import { bodyLimitFor, inspectRequest, isPublicApi, securityHeaders, type RequestFacts } from "@/server/security/request-guard";

const facts = (over: Omit<Partial<RequestFacts>, "headers"> & { headers?: Record<string, string> } = {}): RequestFacts => {
  const { headers, ...rest } = over;
  const pathname = rest.pathname ?? "/api/plans";
  return {
    method: "GET",
    rawUrl: `http://localhost:3000${pathname}`,
    pathname,
    headers: new Headers(headers ?? {}),
    expectedHost: "localhost:3000",
    sessionValid: true,
    ...rest,
  };
};
const json = { "content-type": "application/json", "content-length": "20" };

describe("proxy – lớp lọc 1", () => {
  it("cho qua request hợp lệ", () => {
    expect(inspectRequest(facts())).toEqual({ action: "next" });
    expect(inspectRequest(facts({ method: "POST", headers: { ...json, origin: "http://localhost:3000" } }))).toEqual({ action: "next" });
  });

  it.each([
    "http://localhost:3000/api/plans/..%2f..%2fetc",
    "http://localhost:3000/api/plans/%2e%2e/x",
    "http://localhost:3000/api/plans/a%00b",
    "http://localhost:3000/api/plans\\x",
    `http://localhost:3000/api/${"a".repeat(2100)}`,
  ])("chặn đường dẫn bất thường: %s", (rawUrl) => {
    expect(inspectRequest(facts({ rawUrl }))).toMatchObject({ action: "reject", status: 400 });
  });

  it.each(["PUT", "TRACE", "CONNECT", "OPTIONS"])("chặn phương thức %s", (method) => {
    expect(inspectRequest(facts({ method }))).toMatchObject({ action: "reject", status: 405 });
  });

  it("CSRF: chặn Origin khác host, Origin hỏng, Sec-Fetch-Site cross-site; cho phép origin trong danh sách cho phép", () => {
    expect(inspectRequest(facts({ method: "POST", headers: { ...json, origin: "https://evil.example" } }))).toMatchObject({ status: 403, code: "ERR-CSRF-01" });
    expect(inspectRequest(facts({ method: "DELETE", headers: { origin: "null" } }))).toMatchObject({ status: 403 });
    expect(inspectRequest(facts({ method: "PATCH", headers: { ...json, "sec-fetch-site": "cross-site" } }))).toMatchObject({ status: 403 });
    expect(inspectRequest(facts({ method: "POST", headers: { ...json, "sec-fetch-site": "same-origin" } }))).toEqual({ action: "next" });
    expect(inspectRequest(facts({ method: "POST", headers: { ...json, origin: "https://app.truong.vn" }, allowedOrigins: ["https://app.truong.vn"] }))).toEqual({ action: "next" });
  });

  it("GET không bị kiểm CSRF (không đổi dữ liệu)", () => {
    expect(inspectRequest(facts({ headers: { origin: "https://evil.example" } }))).toEqual({ action: "next" });
  });

  it("body quá lớn theo route → 413; route phiên học ở nhà được phép lớn hơn", () => {
    expect(inspectRequest(facts({ method: "POST", headers: { ...json, "content-length": String(65 * 1024) } }))).toMatchObject({ status: 413 });
    expect(inspectRequest(facts({ method: "POST", pathname: "/api/family/sessions", headers: { ...json, "content-length": String(500 * 1024) } }))).toEqual({ action: "next" });
    expect(bodyLimitFor("/api/family/sessions")).toBeGreaterThan(bodyLimitFor("/api/plans"));
  });

  it("Content-Length âm/không phải số → 400; có body mà không phải JSON → 415", () => {
    expect(inspectRequest(facts({ method: "POST", headers: { "content-length": "-1" } }))).toMatchObject({ status: 400 });
    expect(inspectRequest(facts({ method: "POST", headers: { "content-length": "abc" } }))).toMatchObject({ status: 400 });
    expect(inspectRequest(facts({ method: "POST", headers: { "content-type": "text/plain", "content-length": "5" } }))).toMatchObject({ status: 415 });
    expect(inspectRequest(facts({ method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "transfer-encoding": "chunked" } }))).toMatchObject({ status: 415 });
  });

  it("POST không có body (vd. đăng xuất) không bắt buộc Content-Type", () => {
    expect(inspectRequest(facts({ method: "POST", pathname: "/api/auth/logout" }))).toEqual({ action: "next" });
  });

  it("chưa đăng nhập: API riêng tư → 401, trang riêng tư → chuyển /login, API công khai vẫn qua", () => {
    expect(inspectRequest(facts({ sessionValid: false }))).toMatchObject({ status: 401 });
    expect(inspectRequest(facts({ sessionValid: false, pathname: "/teacher/plan/x" }))).toEqual({ action: "redirect", to: "/login" });
    expect(inspectRequest(facts({ sessionValid: false, pathname: "/family" }))).toEqual({ action: "redirect", to: "/login" });
    expect(inspectRequest(facts({ sessionValid: false, pathname: "/login" }))).toEqual({ action: "next" });
    expect(inspectRequest(facts({ sessionValid: false, pathname: "/parent/abc12345" }))).toEqual({ action: "next" });
    expect(inspectRequest(facts({ sessionValid: false, method: "POST", pathname: "/api/auth/login", headers: json }))).toEqual({ action: "next" });
  });

  it("danh sách API công khai chặt: token phải đúng định dạng, không mở rộng sang route con", () => {
    expect(isPublicApi("/api/parent/demo-token-1")).toBe(true);
    expect(isPublicApi("/api/parent/demo-token-1/probe")).toBe(false);
    expect(isPublicApi("/api/parent/a.b")).toBe(false);
    expect(isPublicApi("/api/auth/demo")).toBe(false);
  });

  it("header bảo mật: CSP chặn nhúng khung, không cache API, HSTS chỉ ở production", () => {
    const prod = securityHeaders({ dev: false, isApi: true });
    expect(prod["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(prod["Content-Security-Policy"]).not.toContain("unsafe-eval");
    expect(prod["Cache-Control"]).toBe("no-store");
    expect(prod["Strict-Transport-Security"]).toBeDefined();
    expect(prod["Referrer-Policy"]).toBe("same-origin");
    const dev = securityHeaders({ dev: true, isApi: false });
    expect(dev["Content-Security-Policy"]).toContain("unsafe-eval");
    expect(dev["Strict-Transport-Security"]).toBeUndefined();
    expect(dev["Cache-Control"]).toBeUndefined();
  });
});
