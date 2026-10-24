import { describe, it, expect } from "vitest";
import { checkScreenFree } from "@/core/guardrails/screen-free-guard";

describe("ScreenFreeGuard (BR-005)", () => {
  it.each(["Cho trẻ xem video trên YouTube", "Trẻ bấm máy tính bảng để chọn đáp án", "Bật tivi cho cả lớp xem"])(
    "chặn: %s",
    (text) => {
      expect(checkScreenFree(text).passed).toBe(false);
    },
  );

  it("cho phép câu phủ định / hoạt động thật", () => {
    expect(checkScreenFree("Trò chơi hoàn toàn không dùng màn hình, trẻ chơi với hộp sữa").passed).toBe(true);
  });

  it("cô giáo có thể dùng thiết bị ngoài hoạt động của trẻ? không — chỉ quét hướng dẫn cho trẻ", () => {
    expect(checkScreenFree("Cô gõ nhịp bằng thìa gỗ").passed).toBe(true);
  });
});
