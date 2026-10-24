import { describe, it, expect } from "vitest";
import { getSessionSecret, SESSION_TTL_SECONDS, signSession, verifySession } from "@/server/session-token";

const SECRET = "s".repeat(40);
const NOW = Date.UTC(2026, 9, 24, 8);

describe("session token v2 (ký HMAC, có hạn dùng, có phiên bản)", () => {
  it("ký và xác minh lại đúng user, phiên bản, hạn dùng mặc định 12 giờ", () => {
    const token = signSession({ sub: "demo-teacher-lan", sv: 3 }, SECRET, NOW);
    const claims = verifySession(token, SECRET, NOW);
    expect(claims).toEqual({ sub: "demo-teacher-lan", sv: 3, exp: NOW / 1000 + SESSION_TTL_SECONDS });
  });

  it("từ chối token hết hạn (đúng tại thời điểm hết hạn cũng từ chối)", () => {
    const token = signSession({ sub: "u1" }, SECRET, NOW);
    expect(verifySession(token, SECRET, NOW + SESSION_TTL_SECONDS * 1000 - 1)).not.toBeNull();
    expect(verifySession(token, SECRET, NOW + SESSION_TTL_SECONDS * 1000)).toBeNull();
  });

  it("từ chối token bị sửa payload, sửa chữ ký, ký bằng khóa khác, sai phiên bản định dạng", () => {
    const token = signSession({ sub: "u1" }, SECRET, NOW);
    const [v, payload, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin", sv: 0, exp: NOW / 1000 + 999 })).toString("base64url");
    expect(verifySession(`${v}.${forged}.${mac}`, SECRET, NOW)).toBeNull();
    expect(verifySession(`${v}.${payload}.${mac.slice(0, -2)}xx`, SECRET, NOW)).toBeNull();
    expect(verifySession(token, "k".repeat(40), NOW)).toBeNull();
    expect(verifySession(`v1.${payload}.${mac}`, SECRET, NOW)).toBeNull();
  });

  it("định dạng rác, rỗng, quá dài, thiếu phần đều trả null (không ném lỗi)", () => {
    for (const bad of [undefined, "", "rac", "a.b", "a.b.c.d", "v2..", "v2.%%%.x", "v2." + "a".repeat(600) + ".x"]) {
      expect(verifySession(bad, SECRET, NOW)).toBeNull();
    }
  });

  it("payload hợp lệ chữ ký nhưng sai kiểu dữ liệu (sv âm, sub lạ) vẫn bị từ chối", async () => {
    const { createHmac } = await import("node:crypto");
    const sign = (p: object) => {
      const body = `v2.${Buffer.from(JSON.stringify(p)).toString("base64url")}`;
      return `${body}.${createHmac("sha256", SECRET).update(body).digest("base64url")}`;
    };
    expect(verifySession(sign({ sub: "u1", sv: -1, exp: NOW / 1000 + 60 }), SECRET, NOW)).toBeNull();
    expect(verifySession(sign({ sub: "../../etc", sv: 0, exp: NOW / 1000 + 60 }), SECRET, NOW)).toBeNull();
    expect(verifySession(sign({ sub: "u1", sv: 0, exp: "never" }), SECRET, NOW)).toBeNull();
  });

  it("không ký id người dùng có ký tự lạ", () => {
    expect(() => signSession({ sub: "a.b" }, SECRET)).toThrow();
  });

  it("thiếu SESSION_SECRET hoặc quá ngắn thì báo lỗi rõ ràng, không dùng khóa mặc định", () => {
    expect(() => getSessionSecret({})).toThrow(/SESSION_SECRET/);
    expect(() => getSessionSecret({ SESSION_SECRET: "ngan" })).toThrow(/32/);
    expect(getSessionSecret({ SESSION_SECRET: SECRET })).toBe(SECRET);
  });
});
