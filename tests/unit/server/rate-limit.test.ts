import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/server/security/rate-limit";

const rule = { limit: 3, windowMs: 60_000 };

describe("rate limiter (cửa sổ trượt)", () => {
  it("cho phép tới giới hạn rồi chặn, kèm số giây cần chờ", () => {
    const rl = createRateLimiter();
    const t = 1_000_000;
    expect([rl.hit("k", rule, t), rl.hit("k", rule, t + 1), rl.hit("k", rule, t + 2)].every((r) => r.ok)).toBe(true);
    const blocked = rl.hit("k", rule, t + 3);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBe(60);
  });

  it("lượt cũ trượt ra khỏi cửa sổ thì được dùng lại", () => {
    const rl = createRateLimiter();
    for (let i = 0; i < 3; i++) rl.hit("k", rule, i);
    expect(rl.hit("k", rule, 59_999).ok).toBe(false);
    expect(rl.hit("k", rule, 60_001).ok).toBe(true);
  });

  it("lượt bị chặn không bị tính thêm (không kéo dài thời gian khóa vô hạn)", () => {
    const rl = createRateLimiter();
    for (let i = 0; i < 3; i++) rl.hit("k", rule, 0);
    for (let i = 0; i < 10; i++) rl.hit("k", rule, 1000);
    expect(rl.hit("k", rule, 60_001).ok).toBe(true);
  });

  it("các khóa độc lập; peek không tính lượt; reset xóa bộ đếm", () => {
    const rl = createRateLimiter();
    for (let i = 0; i < 3; i++) rl.hit("a", rule, 0);
    expect(rl.hit("b", rule, 0).ok).toBe(true);
    expect(rl.peek("a", rule, 1).ok).toBe(false);
    expect(rl.peek("c", rule, 1)).toMatchObject({ ok: true, remaining: 3 });
    rl.reset("a");
    expect(rl.hit("a", rule, 2).ok).toBe(true);
  });
});

describe("device quota limiter (giới hạn tối đa 5 lượt AI cho mỗi thiết bị)", () => {
  it("cho phép đúng 5 lần dùng, lần thứ 6 bị chặn với isExceeded: true", async () => {
    const { createDeviceQuotaLimiter } = await import("@/server/security/rate-limit");
    const dql = createDeviceQuotaLimiter(5);
    const id = "device-test-1";

    expect(dql.getQuota(id)).toMatchObject({ ok: true, limit: 5, used: 0, remaining: 5, isExceeded: false });

    for (let i = 1; i <= 5; i++) {
      const res = dql.consume(id);
      expect(res.ok).toBe(true);
      expect(res.used).toBe(i);
      expect(res.remaining).toBe(5 - i);
    }

    const exceeded = dql.consume(id);
    expect(exceeded.ok).toBe(false);
    expect(exceeded.isExceeded).toBe(true);
    expect(exceeded.remaining).toBe(0);
    expect(exceeded.used).toBe(5);

    const check = dql.getQuota(id);
    expect(check.ok).toBe(false);
    expect(check.isExceeded).toBe(true);
    expect(check.remaining).toBe(0);
  });

  it("các thiết bị khác nhau có hạn mức độc lập", async () => {
    const { createDeviceQuotaLimiter } = await import("@/server/security/rate-limit");
    const dql = createDeviceQuotaLimiter(5);

    for (let i = 0; i < 5; i++) dql.consume("device-a");
    expect(dql.consume("device-a").ok).toBe(false);
    expect(dql.consume("device-b").ok).toBe(true);
    expect(dql.getQuota("device-b").remaining).toBe(4);
  });

  it("reset xóa bộ đếm của thiết bị", async () => {
    const { createDeviceQuotaLimiter } = await import("@/server/security/rate-limit");
    const dql = createDeviceQuotaLimiter(5);

    for (let i = 0; i < 5; i++) dql.consume("device-c");
    expect(dql.consume("device-c").ok).toBe(false);

    dql.reset("device-c");
    expect(dql.getQuota("device-c")).toMatchObject({ ok: true, used: 0, remaining: 5, isExceeded: false });
    expect(dql.consume("device-c").ok).toBe(true);
  });
});
