import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { issueDeviceToken } from "@/server/security/device-id";

const secret = () => process.env.SESSION_SECRET as string;
const visit = (cookie?: string) => proxy(new NextRequest("http://localhost/login", { headers: cookie ? { cookie } : {} }));

describe("proxy – cookie định danh thiết bị", () => {
  it("lần đầu truy cập: cấp cookie sg_device có chữ ký, HttpOnly", () => {
    const res = visit();
    const cookie = res.cookies.get("sg_device");
    expect(cookie?.value).toMatch(/^[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$/);
    expect(cookie?.httpOnly).toBe(true);
    expect(res.headers.get("set-cookie")).toMatch(/sg_device=.*HttpOnly/i);
  });

  it("cookie hợp lệ: giữ nguyên, không cấp lại", () => {
    expect(visit(`sg_device=${issueDeviceToken(secret())}`).cookies.get("sg_device")).toBeUndefined();
  });

  it("cookie giả hoặc sai chữ ký: thay bằng cookie mới", () => {
    const forged = `${"A".repeat(22)}.gia-mao`;
    const value = visit(`sg_device=${forged}`).cookies.get("sg_device")?.value;
    expect(value).toBeDefined();
    expect(value).not.toBe(forged);
  });

  it("xóa cookie của cơ chế cũ (sg_device_id, sg_device_quota)", () => {
    const setCookie = visit(`sg_device=${issueDeviceToken(secret())}; sg_device_id=abc12345; sg_device_quota=x.y`).headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/sg_device_id=;.*Expires=Thu, 01 Jan 1970/);
    expect(setCookie).toMatch(/sg_device_quota=;.*Expires=Thu, 01 Jan 1970/);
  });

  it("không có cookie cũ thì không gửi lệnh xóa", () => {
    expect(visit(`sg_device=${issueDeviceToken(secret())}`).headers.get("set-cookie")).toBeNull();
  });

  it("request bị chặn ở lớp lọc vẫn được cấp cookie thiết bị", () => {
    const res = proxy(new NextRequest("http://localhost/api/plans/..%2f..%2fetc"));
    expect(res.status).toBe(400);
    expect(res.cookies.get("sg_device")).toBeDefined();
  });
});

describe("proxy – lớp lọc chung", () => {
  afterEach(() => {
    delete process.env.ALLOWED_ORIGINS;
  });

  it("gắn header bảo mật cho mọi phản hồi", () => {
    expect(visit().headers.get("content-security-policy")).toContain("default-src 'self'");
  });

  it("vào trang cần đăng nhập khi chưa có phiên: chuyển về /login", () => {
    const res = proxy(new NextRequest("http://localhost/teacher"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login");
  });

  it("phiên hỏng/hết hạn: chuyển về /login và xóa cookie phiên", () => {
    const res = proxy(new NextRequest("http://localhost/teacher", { headers: { cookie: "sg_session=v2.hong.hong" } }));
    expect(res.headers.get("location")).toBe("http://localhost/login");
    expect(res.headers.get("set-cookie")).toMatch(/sg_session=;.*Expires=Thu, 01 Jan 1970/);
  });

  it("request ghi từ nguồn khác bị chặn, trừ nguồn nằm trong ALLOWED_ORIGINS", () => {
    const post = () => proxy(new NextRequest("http://localhost/api/device/quota", { method: "POST", headers: { origin: "https://doi-tac.vn" } }));
    expect(post().status).toBe(403);

    process.env.ALLOWED_ORIGINS = " https://doi-tac.vn , ";
    expect(post().status).toBe(200);
  });
});
