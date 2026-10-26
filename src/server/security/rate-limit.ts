import { createHmac, timingSafeEqual } from "node:crypto";

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

/** Giới hạn tối đa số lượt tương tác AI cho mỗi thiết bị */
export const DEVICE_AI_LIMIT = Number(process.env.DEVICE_AI_LIMIT) || 5;
export const DEVICE_COOKIE = "sg_device_id";
export const DEVICE_QUOTA_COOKIE = "sg_device_quota";

const DEVICE_SECRET = process.env.SESSION_SECRET || "stuguide-device-quota-secret-key-at-least-32-chars";

export interface DeviceQuotaTokenPayload {
  deviceId: string;
  used: number;
  isExceeded: boolean;
}

export function signDeviceQuota(deviceId: string, used: number, isExceeded: boolean): string {
  const data = `${deviceId}:${used}:${isExceeded ? 1 : 0}`;
  const sig = createHmac("sha256", DEVICE_SECRET).update(data).digest("base64url");
  const payload = Buffer.from(data).toString("base64url");
  return `${payload}.${sig}`;
}

export function parseDeviceQuota(token: string | undefined | null): DeviceQuotaTokenPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64Data, sig] = parts;
  try {
    const data = Buffer.from(b64Data, "base64url").toString("utf8");
    const expectedSig = createHmac("sha256", DEVICE_SECRET).update(data).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

    const [deviceId, usedStr, isExceededStr] = data.split(":");
    const used = Number.parseInt(usedStr, 10);
    if (!deviceId || Number.isNaN(used)) return null;

    return {
      deviceId,
      used,
      isExceeded: isExceededStr === "1" || used >= DEVICE_AI_LIMIT,
    };
  } catch {
    return null;
  }
}

export interface DeviceQuotaResult {
  ok: boolean;
  limit: number;
  used: number;
  remaining: number;
  isExceeded: boolean;
}

export interface DeviceQuotaLimiter {
  getQuota(deviceId: string, baseUsed?: number): DeviceQuotaResult;
  consume(deviceId: string, baseUsed?: number): DeviceQuotaResult;
  sync(deviceId: string, used: number): void;
  reset(deviceId?: string): void;
}

export function createDeviceQuotaLimiter(limit = DEVICE_AI_LIMIT): DeviceQuotaLimiter {
  const store = new Map<string, number>();

  return {
    getQuota(deviceId: string, baseUsed = 0): DeviceQuotaResult {
      const stored = store.get(deviceId) ?? 0;
      const used = Math.max(stored, baseUsed);
      if (used > stored) store.set(deviceId, used);
      const isExceeded = used >= limit;
      return {
        ok: !isExceeded,
        limit,
        used,
        remaining: Math.max(0, limit - used),
        isExceeded,
      };
    },
    consume(deviceId: string, baseUsed = 0): DeviceQuotaResult {
      const stored = store.get(deviceId) ?? 0;
      const current = Math.max(stored, baseUsed);
      if (current >= limit) {
        store.set(deviceId, limit);
        return {
          ok: false,
          limit,
          used: limit,
          remaining: 0,
          isExceeded: true,
        };
      }
      const nextUsed = current + 1;
      store.set(deviceId, nextUsed);
      return {
        ok: true,
        limit,
        used: nextUsed,
        remaining: Math.max(0, limit - nextUsed),
        isExceeded: nextUsed >= limit,
      };
    },
    sync(deviceId: string, used: number) {
      const stored = store.get(deviceId) ?? 0;
      store.set(deviceId, Math.max(stored, used));
    },
    reset(deviceId?: string) {
      if (deviceId) store.delete(deviceId);
      else store.clear();
    },
  };
}

const g = globalThis as unknown as {
  __sgRateLimiter?: RateLimiter;
  __sgDeviceQuotaLimiter?: DeviceQuotaLimiter;
};
export const getRateLimiter = () => (g.__sgRateLimiter ??= createRateLimiter());
export const getDeviceQuotaLimiter = () => (g.__sgDeviceQuotaLimiter ??= createDeviceQuotaLimiter());
