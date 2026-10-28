import { describe, it, expect } from "vitest";
import { isCronAuthorized } from "@/server/security/cron-auth";

const SECRET = "s3cret-value-with-enough-length";

describe("isCronAuthorized", () => {
  it("chấp nhận đúng Bearer secret", () => {
    expect(isCronAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it.each([
    ["thiếu header", null],
    ["header rỗng", ""],
    ["sai secret", "Bearer sai-roi"],
    ["secret là tiền tố của secret thật", `Bearer ${SECRET.slice(0, -1)}`],
    ["secret dài hơn secret thật", `Bearer ${SECRET}x`],
    ["thiếu scheme", SECRET],
    ["scheme khác", `Basic ${SECRET}`],
    ["bearer viết thường", `bearer ${SECRET}`],
    ["chỉ có Bearer", "Bearer "],
    ["thừa khoảng trắng", `Bearer  ${SECRET}`],
  ])("từ chối: %s", (_name, header) => {
    expect(isCronAuthorized(header, SECRET)).toBe(false);
  });

  it("chưa cấu hình secret thì luôn từ chối, kể cả khi gửi Bearer rỗng/trùng", () => {
    expect(isCronAuthorized(`Bearer ${SECRET}`, undefined)).toBe(false);
    expect(isCronAuthorized(`Bearer ${SECRET}`, "")).toBe(false);
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
  });
});
