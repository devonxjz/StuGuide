import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/server/password";

describe("mật khẩu (scrypt, mỗi tài khoản một salt, xác minh bất đồng bộ)", () => {
  it("băm không lưu mật khẩu gốc, cùng mật khẩu ra hash khác nhau, xác minh đúng/sai", async () => {
    const a = hashPassword("stuguide");
    const b = hashPassword("stuguide");
    expect(a).not.toContain("stuguide");
    expect(a).not.toBe(b);
    expect(await verifyPassword("stuguide", a)).toBe(true);
    expect(await verifyPassword("Stuguide", a)).toBe(false);
    expect(await verifyPassword("", a)).toBe(false);
  });

  it("hash rỗng, sai định dạng, sai độ dài thì luôn từ chối (vẫn chạy băm giả để thời gian như nhau)", async () => {
    for (const stored of [null, undefined, "", "khong-phai-hash", "zz:yy", `${"a".repeat(32)}:${"b".repeat(10)}`]) {
      expect(await verifyPassword("stuguide", stored)).toBe(false);
    }
  });
});
