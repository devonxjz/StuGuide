import { describe, it, expect } from "vitest";
import { DEFAULT_QUOTA, readCachedQuota } from "@/lib/device-quota";

// Môi trường node (không có window): mô phỏng lúc Next render phía server
describe("readCachedQuota khi render phía server", () => {
  it("không đụng tới localStorage, trả về mặc định", () => {
    expect(typeof window).toBe("undefined");
    expect(readCachedQuota()).toEqual(DEFAULT_QUOTA);
  });
});
