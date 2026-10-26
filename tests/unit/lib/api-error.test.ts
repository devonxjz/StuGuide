import { describe, it, expect } from "vitest";
import { ApiError, apiErrorFrom, userMessage } from "@/lib/api-error";

describe("apiErrorFrom", () => {
  it("lấy mã, thông điệp từ body lỗi chuẩn và status từ HTTP", async () => {
    const err = await apiErrorFrom(Response.json({ error: { code: "ERR-RATE-01", message: "Thao tác quá nhanh" } }, { status: 429 }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: "ERR-RATE-01", message: "Thao tác quá nhanh", status: 429 });
  });

  it("body không phải JSON, JSON sai dạng hoặc thiếu trường: dùng mặc định", async () => {
    const defaults = { code: "ERR-INTERNAL", message: "Có lỗi xảy ra" };
    expect(await apiErrorFrom(new Response("Bad Gateway", { status: 502 }))).toMatchObject({ ...defaults, status: 502 });
    expect(await apiErrorFrom(Response.json({ ok: false }, { status: 500 }))).toMatchObject(defaults);
    expect(await apiErrorFrom(Response.json({ error: { code: "ERR-X" } }, { status: 400 }))).toMatchObject({ code: "ERR-X", message: "Có lỗi xảy ra" });
    expect(await apiErrorFrom(new Response(null, { status: 503 }))).toMatchObject({ ...defaults, status: 503 });
  });
});

describe("userMessage", () => {
  const fallback = "Hệ thống AI đang bận";

  it.each([
    [400, "Tin nhắn không hợp lệ"],
    [403, "Truy cập bị từ chối"],
    [429, "Thao tác quá nhanh, vui lòng thử lại sau 30 giây"],
    [429, "Quá hạn sử dụng, bạn phải mua thêm lượt"],
  ])("lỗi nghiệp vụ %i: hiện đúng thông điệp server", (status, message) => {
    expect(userMessage(new ApiError("ERR", message, status), fallback)).toBe(message);
  });

  it("lỗi hệ thống 5xx: dùng câu dự phòng (không lộ chi tiết kỹ thuật)", () => {
    expect(userMessage(new ApiError("ERR-INTERNAL", "Có lỗi xảy ra", 500), fallback)).toBe(fallback);
    expect(userMessage(new ApiError("ERR-NET-01", "Kết nối bị gián đoạn", 502), fallback)).toBe(fallback);
  });

  it("lỗi không phải ApiError (mất mạng, lỗi lạ): dùng câu dự phòng", () => {
    expect(userMessage(new TypeError("Failed to fetch"), fallback)).toBe(fallback);
    expect(userMessage(undefined, fallback)).toBe(fallback);
  });
});
