import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const visit = (cookie?: string) => proxy(new NextRequest("http://localhost/login", { headers: cookie ? { cookie } : {} }));

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
    const post = () => proxy(new NextRequest("http://localhost/api/auth/login", { method: "POST", headers: { origin: "https://doi-tac.vn" } }));
    expect(post().status).toBe(403);

    process.env.ALLOWED_ORIGINS = " https://doi-tac.vn , ";
    expect(post().status).toBe(200);
  });
});
