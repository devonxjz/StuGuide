import { describe, it, expect } from "vitest";
import { detectNeedsPracticeStreak, weekStart } from "@/core/analytics/needs-practice-streak";

const d = (s: string) => new Date(s + "T08:00:00Z");

describe("detectNeedsPracticeStreak (AI Behavioral Analytics)", () => {
  it("phát hiện 3 tuần liên tiếp cần rèn thêm", () => {
    const r = detectNeedsPracticeStreak(
      [
        { date: d("2026-10-05"), rating: "needs_practice" },
        { date: d("2026-10-12"), rating: "needs_practice" },
        { date: d("2026-10-19"), rating: "needs_practice" },
      ],
      3,
    );
    expect(r.triggered).toBe(true);
    expect(r.weekCount).toBe(3);
  });

  it("không kích hoạt khi bị ngắt quãng bởi tuần đã đạt", () => {
    const r = detectNeedsPracticeStreak(
      [
        { date: d("2026-10-05"), rating: "needs_practice" },
        { date: d("2026-10-12"), rating: "achieved" },
        { date: d("2026-10-19"), rating: "needs_practice" },
      ],
      3,
    );
    expect(r.triggered).toBe(false);
    expect(r.weekCount).toBe(1);
  });

  it("không kích hoạt khi các tuần không liền nhau", () => {
    const r = detectNeedsPracticeStreak(
      [
        { date: d("2026-09-21"), rating: "needs_practice" },
        { date: d("2026-10-12"), rating: "needs_practice" },
        { date: d("2026-10-19"), rating: "needs_practice" },
      ],
      3,
    );
    expect(r.triggered).toBe(false);
  });

  it("nhiều bản ghi trong cùng tuần chỉ tính một lần (lấy bản mới nhất)", () => {
    const r = detectNeedsPracticeStreak(
      [
        { date: d("2026-10-12"), rating: "needs_practice" },
        { date: d("2026-10-19"), rating: "achieved" },
        { date: d("2026-10-20"), rating: "needs_practice" },
      ],
      2,
    );
    expect(r.weekCount).toBe(2);
    expect(r.triggered).toBe(true);
  });

  it("weekStart trả về 00:00 thứ Hai theo giờ Việt Nam (UTC+7)", () => {
    expect(weekStart(d("2026-10-24")).toISOString()).toBe("2026-10-18T17:00:00.000Z");
  });

  it("6 giờ sáng thứ Hai giờ VN (vẫn là Chủ nhật theo UTC) được tính vào tuần mới", () => {
    const mondayMorningVN = new Date("2026-10-18T23:00:00Z"); // 06:00 thứ Hai 19/10 giờ VN
    const sundayEveningVN = new Date("2026-10-18T12:00:00Z"); // 19:00 Chủ nhật 18/10 giờ VN
    expect(weekStart(mondayMorningVN).toISOString()).toBe("2026-10-18T17:00:00.000Z");
    expect(weekStart(sundayEveningVN).toISOString()).toBe("2026-10-11T17:00:00.000Z");
  });

  it("không có dữ liệu thì không kích hoạt", () => {
    expect(detectNeedsPracticeStreak([], 3)).toEqual({ triggered: false, weekCount: 0 });
  });
});
