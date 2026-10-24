import type { AssessmentRating } from "../constants/status";

export interface RatingPoint {
  date: Date;
  rating: AssessmentRating;
}

export interface StreakResult {
  triggered: boolean;
  /** Số tuần liên tiếp (tính ngược từ tuần gần nhất) bé ở mức "cần rèn thêm" */
  weekCount: number;
}

const WEEK_MS = 7 * 24 * 3600 * 1000;
/** Giờ Việt Nam (UTC+7, không có giờ mùa hè): tuần học bắt đầu thứ Hai 00:00 theo giờ địa phương. */
const VN_OFFSET_MS = 7 * 3600 * 1000;

/** Thứ Hai 00:00 (giờ Việt Nam) của tuần chứa `date`, biểu diễn bằng mốc UTC tương ứng. */
export function weekStart(date: Date): Date {
  const local = new Date(date.getTime() + VN_OFFSET_MS);
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return new Date(d.getTime() - VN_OFFSET_MS);
}

/**
 * Mỗi tuần lấy bản ghi mới nhất; đếm ngược số tuần LIỀN NHAU có "cần rèn thêm".
 * Ngắt quãng (tuần đạt hoặc thiếu tuần) thì dừng.
 */
export function detectNeedsPracticeStreak(points: RatingPoint[], threshold: number): StreakResult {
  const latestByWeek = new Map<number, RatingPoint>();
  for (const p of points) {
    const key = weekStart(p.date).getTime();
    const cur = latestByWeek.get(key);
    if (!cur || p.date > cur.date) latestByWeek.set(key, p);
  }

  const weeks = [...latestByWeek.entries()].sort((a, b) => b[0] - a[0]);
  let count = 0;
  let prevKey: number | null = null;
  for (const [key, point] of weeks) {
    if (point.rating !== "needs_practice") break;
    if (prevKey !== null && prevKey - key !== WEEK_MS) break;
    count += 1;
    prevKey = key;
  }
  return { triggered: count >= threshold, weekCount: count };
}
