import { describe, it, expect } from "vitest";
import { deviceCookieOptions, issueDeviceToken, verifyDeviceToken } from "@/server/security/device-id";

const secret = "unit-secret-0123456789-abcdefghijklmnop";

describe("issueDeviceToken / verifyDeviceToken", () => {
  it("token do server cấp được chấp nhận và trả về đúng id", () => {
    const token = issueDeviceToken(secret);
    const [id] = token.split(".");
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(verifyDeviceToken(token, secret)).toBe(id);
  });

  it("mỗi lần cấp là một thiết bị mới", () => {
    const ids = new Set(Array.from({ length: 50 }, () => issueDeviceToken(secret)));
    expect(ids.size).toBe(50);
  });

  it("không có token → null", () => {
    expect(verifyDeviceToken(undefined, secret)).toBeNull();
    expect(verifyDeviceToken(null, secret)).toBeNull();
    expect(verifyDeviceToken("", secret)).toBeNull();
  });

  it("id do client tự đặt (không có chữ ký, kiểu cookie cũ) → null", () => {
    expect(verifyDeviceToken("dev-tu-dat-12345678", secret)).toBeNull();
  });

  it("sai số phần → null", () => {
    const token = issueDeviceToken(secret);
    expect(verifyDeviceToken(`${token}.thua`, secret)).toBeNull();
    expect(verifyDeviceToken(`${token.split(".")[0]}.`, secret)).toBeNull();
  });

  it("đổi id nhưng giữ chữ ký → null", () => {
    const [, signature] = issueDeviceToken(secret).split(".");
    expect(verifyDeviceToken(`${"A".repeat(22)}.${signature}`, secret)).toBeNull();
  });

  it("id sai định dạng (ngắn, dài, ký tự lạ) → null dù chữ ký khớp định dạng", () => {
    const [, signature] = issueDeviceToken(secret).split(".");
    for (const id of ["short", "A".repeat(23), `${"A".repeat(21)}!`]) {
      expect(verifyDeviceToken(`${id}.${signature}`, secret)).toBeNull();
    }
  });

  it("sửa chữ ký (cùng độ dài hoặc khác độ dài) → null", () => {
    const [id, signature] = issueDeviceToken(secret).split(".");
    const flipped = signature.slice(0, -1) + (signature.endsWith("A") ? "B" : "A");
    expect(verifyDeviceToken(`${id}.${flipped}`, secret)).toBeNull();
    expect(verifyDeviceToken(`${id}.${signature}xx`, secret)).toBeNull();
  });

  it("ký bằng khóa khác → null", () => {
    expect(verifyDeviceToken(issueDeviceToken(`${secret}-khac`), secret)).toBeNull();
  });

  it("token quá dài bị từ chối trước khi tính HMAC", () => {
    expect(verifyDeviceToken(`${"A".repeat(22)}.${"x".repeat(200)}`, secret)).toBeNull();
  });
});

describe("deviceCookieOptions", () => {
  it("luôn HttpOnly (JS phía client không đọc/sửa được); Secure khi chạy production", () => {
    expect(deviceCookieOptions(false)).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    expect(deviceCookieOptions(true)).toMatchObject({ httpOnly: true, secure: false });
  });
});
