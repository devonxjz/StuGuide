/**
 * Giới hạn tần suất theo cửa sổ trượt (sliding window log), lưu trong RAM của tiến trình (prototype một máy chủ).
 * Production nhiều instance: thay store bằng Redis, giữ nguyên interface `RateLimiter`.
 */
export interface RateRule {
  limit: number;
  windowMs: number;
}

export type RateBucket = "login-ip" | "login-account" | "ai" | "write" | "read" | "public-token";

/** Ngưỡng theo nhóm thao tác. AI tốn chi phí nên chặt nhất; đăng nhập chống dò mật khẩu. */
export const RATE_RULES: Record<RateBucket, RateRule> = {
  "login-ip": { limit: 20, windowMs: 15 * 60_000 },
  "login-account": { limit: 5, windowMs: 15 * 60_000 },
  ai: { limit: 20, windowMs: 60_000 },
  write: { limit: 120, windowMs: 60_000 },
  read: { limit: 600, windowMs: 60_000 },
  "public-token": { limit: 60, windowMs: 60_000 },
};

export interface RateResult {
  ok: boolean;
  remaining: number;
  /** Giây cần chờ khi bị chặn */
  retryAfter: number;
}

export interface RateLimiter {
  hit(key: string, rule: RateRule, now?: number): RateResult;
  /** Xem trạng thái mà không tính thêm lượt (vd. kiểm tra khóa tài khoản trước khi xác minh mật khẩu) */
  peek(key: string, rule: RateRule, now?: number): RateResult;
  reset(key: string): void;
}

const MAX_KEYS = 50_000;

export function createRateLimiter(): RateLimiter {
  const store = new Map<string, number[]>();

  const prune = (key: string, rule: RateRule, now: number) => {
    const list = (store.get(key) ?? []).filter((t) => now - t < rule.windowMs);
    if (list.length) store.set(key, list);
    else store.delete(key);
    return list;
  };

  const result = (list: number[], rule: RateRule, now: number): RateResult => {
    const ok = list.length < rule.limit;
    const oldest = list[0] ?? now;
    return { ok, remaining: Math.max(0, rule.limit - list.length), retryAfter: ok ? 0 : Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000)) };
  };

  return {
    hit(key, rule, now = Date.now()) {
      const list = prune(key, rule, now);
      const r = result(list, rule, now);
      if (!r.ok) return r;
      if (store.size >= MAX_KEYS && !store.has(key)) {
        // chống phình bộ nhớ khi bị dội nhiều khóa lạ: bỏ khóa cũ nhất
        const first = store.keys().next().value;
        if (first !== undefined) store.delete(first);
      }
      list.push(now);
      store.set(key, list);
      return { ...r, remaining: r.remaining - 1 };
    },
    peek(key, rule, now = Date.now()) {
      return result(prune(key, rule, now), rule, now);
    },
    reset(key) {
      store.delete(key);
    },
  };
}

const g = globalThis as unknown as { __sgRateLimiter?: RateLimiter };
export const getRateLimiter = () => (g.__sgRateLimiter ??= createRateLimiter());
