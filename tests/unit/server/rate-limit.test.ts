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
