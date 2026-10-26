import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createTestContainer } from "../helpers/test-container";
import { sessionCookie } from "@/server/session";
import * as quotaRoute from "@/app/api/device/quota/route";
import { POST as chat } from "@/app/api/chat/route";
import { POST as familyActivity } from "@/app/api/family/activity/route";
import { POST as createPlan } from "@/app/api/plans/route";
import { GET as listConversations } from "@/app/api/conversations/route";
import { getRateLimiter } from "@/server/security/rate-limit";
import { issueDeviceToken } from "@/server/security/device-id";
import { AIMessage } from "@langchain/core/messages";
import { fakeModel } from "@langchain/core/testing";

type Setup = Awaited<ReturnType<typeof createTestContainer>>;
let ids: Setup["ids"];
let container: Setup["container"];
let setChatModel: Setup["setChatModel"];

const secret = () => process.env.SESSION_SECRET as string;
const newDevice = () => issueDeviceToken(secret());
const deviceKey = (token: string) => `device:${token.split(".")[0]}`;

let ipSeq = 0;
/** Mỗi test một IP riêng để trần theo IP không ảnh hưởng chéo giữa các test */
const newIp = () => `198.51.100.${++ipSeq}`;

const makeModel = (count = 40) => {
  let m = fakeModel();
  for (let i = 0; i < count; i++) m = m.respond(new AIMessage(`Phản hồi AI ${i}`));
  return m;
};

beforeAll(async () => {
  const t = await createTestContainer();
  ids = t.ids;
  container = t.container;
  setChatModel = t.setChatModel;
});

beforeEach(() => {
  getRateLimiter().reset(`ai:${ids.teacherId}`);
  getRateLimiter().reset(`ai:demo-parent-1`);
  setChatModel(makeModel());
});

interface ReqInit {
  method?: string;
  body?: unknown;
  user?: string;
  device?: string;
  ip?: string;
  cookies?: string[];
  headers?: Record<string, string>;
}

const req = (url: string, init: ReqInit = {}) => {
  const cookies = [...(init.cookies ?? [])];
  if (init.user) {
    const c = sessionCookie(init.user);
    if (c) cookies.push(`${c.name}=${c.value}`);
  }
  if (init.device) cookies.push(`sg_device=${init.device}`);
  const headers: Record<string, string> = { "content-type": "application/json", ...init.headers };
  if (cookies.length) headers.cookie = cookies.join("; ");
  if (init.ip) headers["x-forwarded-for"] = init.ip;
  return new NextRequest(`http://localhost${url}`, { method: init.method ?? "GET", headers, body: init.body ? JSON.stringify(init.body) : undefined });
};

const ctx = <P,>(params: P) => ({ params: Promise.resolve(params) });

let msgSeq = 0;
const sendChat = (init: Omit<ReqInit, "body" | "method" | "user">) => {
  const n = ++msgSeq;
  return chat(
    req("/api/chat", {
      ...init,
      method: "POST",
      user: ids.teacherId,
      body: { id: `conv-quota-${n}`, message: { id: `m-${n}`, role: "user", parts: [{ type: "text", text: `Tin nhắn ${n}` }] } },
    }),
    ctx({}),
  );
};

const getQuota = async (init: ReqInit) => (await quotaRoute.GET(req("/api/device/quota", init), ctx({}))).json();

const QUOTA_ERROR = { error: { code: "ERR-QUOTA-EXCEEDED", message: "Quá hạn sử dụng, bạn phải mua thêm lượt" } };

describe("Quota AI dùng thử: 5 lượt/thiết bị, 15 lượt/mạng (IP)", () => {
  it("GET /api/device/quota trả về trạng thái ban đầu, kể cả khi chưa có cookie thiết bị", async () => {
    const initial = { limit: 5, used: 0, remaining: 5, isExceeded: false, message: null };
    expect(await getQuota({ device: newDevice(), ip: newIp() })).toEqual(initial);
    expect(await getQuota({ ip: newIp() })).toEqual(initial);
  });

  it("chặn đúng sau 5 lượt, trả 429 và thông báo 'Quá hạn sử dụng, bạn phải mua thêm lượt'", async () => {
    const device = newDevice();
    const ip = newIp();

    for (let i = 1; i <= 5; i++) {
      const res = await sendChat({ device, ip });
      expect(res.status).toBe(200);
      expect(res.headers.get("X-Device-AI-Limit")).toBe("5");
      expect(res.headers.get("X-Device-AI-Used")).toBe(String(i));
      expect(res.headers.get("X-Device-AI-Remaining")).toBe(String(5 - i));
    }

    for (let i = 0; i < 3; i++) {
      const blocked = await sendChat({ device, ip });
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get("Retry-After")).toBe("86400");
      expect(blocked.headers.get("X-Device-AI-Remaining")).toBe("0");
      expect(await blocked.json()).toEqual(QUOTA_ERROR);
    }

    expect(await getQuota({ device, ip })).toMatchObject({ used: 5, remaining: 0, isExceeded: true, message: "Quá hạn sử dụng, bạn phải mua thêm lượt" });
  });

  it("chặn trên mọi tính năng AI khi thiết bị đã dùng hết lượt", async () => {
    const device = newDevice();
    const ip = newIp();
    for (let i = 0; i < 5; i++) expect((await sendChat({ device, ip })).status).toBe(200);

    const activity = await familyActivity(req("/api/family/activity", { method: "POST", user: "demo-parent-1", device, ip, body: { studentId: ids.huyId } }), ctx({}));
    expect(activity.status).toBe(429);
    expect(await activity.json()).toEqual(QUOTA_ERROR);

    const plan = await createPlan(
      req("/api/plans", {
        method: "POST",
        user: ids.teacherId,
        device,
        ip,
        body: { ageGroup: "4-5y", developmentArea: "physical", topic: "Bài thể dục sáng", materials: ["Bóng nhựa"], duration: 20, space: "indoor" },
      }),
      ctx({}),
    );
    expect(plan.status).toBe(429);
    expect(await plan.json()).toEqual(QUOTA_ERROR);
  });

  it("API không phải AI vẫn hoạt động khi đã hết lượt AI", async () => {
    const device = newDevice();
    const ip = newIp();
    for (let i = 0; i < 5; i++) await sendChat({ device, ip });

    const conv = await listConversations(req("/api/conversations", { user: ids.teacherId, device, ip }), ctx({}));
    expect(conv.status).toBe(200);
  });

  it("thiết bị khác cùng mạng vẫn dùng được khi trần IP còn lượt", async () => {
    const ip = newIp();
    const deviceA = newDevice();
    for (let i = 0; i < 5; i++) await sendChat({ device: deviceA, ip });
    expect((await sendChat({ device: deviceA, ip })).status).toBe(429);

    const resB = await sendChat({ device: newDevice(), ip });
    expect(resB.status).toBe(200);
    expect(resB.headers.get("X-Device-AI-Used")).toBe("1");
    expect(resB.headers.get("X-Device-AI-Remaining")).toBe("4");
  });

  it("số lượt lưu trong DB (bảng AiQuota), không phụ thuộc cookie hay RAM", async () => {
    const device = newDevice();
    const ip = newIp();
    for (let i = 0; i < 3; i++) await sendChat({ device, ip });

    expect(await container.prisma.aiQuota.findUnique({ where: { key: deviceKey(device) } })).toMatchObject({ used: 3 });
    expect(await container.prisma.aiQuota.findUnique({ where: { key: `ip:${ip}` } })).toMatchObject({ used: 3 });
    expect(await getQuota({ device, ip })).toMatchObject({ used: 3, remaining: 2 });
  });

  it("input sai bị từ chối trước khi trừ lượt (gửi sai không mất lượt)", async () => {
    const device = newDevice();
    const ip = newIp();
    const invalid = await createPlan(req("/api/plans", { method: "POST", user: ids.teacherId, device, ip, body: { topic: "" } }), ctx({}));
    expect(invalid.status).toBe(400);
    expect(await getQuota({ device, ip })).toMatchObject({ used: 0, remaining: 5 });
  });

  it("handler lỗi sau khi đã trừ lượt vẫn tính lượt (AI có thể đã được gọi)", async () => {
    const device = newDevice();
    const ip = newIp();
    // phụ huynh 1 xin gợi ý cho bé không phải con mình → service từ chối sau khi request đã hợp lệ về mặt input
    const denied = await familyActivity(req("/api/family/activity", { method: "POST", user: "demo-parent-1", device, ip, body: { studentId: ids.otherStudentId } }), ctx({}));
    expect(denied.status).toBeGreaterThanOrEqual(400);
    expect(denied.status).not.toBe(429);
    expect(await getQuota({ device, ip })).toMatchObject({ used: 1, remaining: 4 });
  });

  it("chưa đăng nhập hoặc sai vai trò: bị chặn trước, không mất lượt", async () => {
    const device = newDevice();
    const ip = newIp();
    const anonymous = await chat(req("/api/chat", { method: "POST", device, ip, body: {} }), ctx({}));
    expect(anonymous.status).toBe(401);
    const wrongRole = await familyActivity(req("/api/family/activity", { method: "POST", user: ids.teacherId, device, ip, body: { studentId: ids.huyId } }), ctx({}));
    expect(wrongRole.status).toBe(403);
    expect(await getQuota({ device, ip })).toMatchObject({ used: 0 });
  });
});

describe("Các cách bypass quota cũ đã bị chặn", () => {
  it("không còn API reset quota (POST /api/device/quota)", () => {
    expect(quotaRoute).not.toHaveProperty("POST");
  });

  it("header x-device-id và cookie sg_device_id tự đặt bị bỏ qua", async () => {
    const device = newDevice();
    const ip = newIp();
    for (let i = 0; i < 5; i++) await sendChat({ device, ip });

    const spoofed = await sendChat({ device, ip, headers: { "x-device-id": "thiet-bi-moi-12345678" }, cookies: ["sg_device_id=thiet-bi-moi-87654321"] });
    expect(spoofed.status).toBe(429);
  });

  it("xóa cookie / tự chế cookie để làm 'thiết bị mới' liên tục: bị chặn bởi trần 15 lượt của mạng", async () => {
    const ip = newIp();
    for (let i = 1; i <= 15; i++) {
      // mỗi request một thiết bị mới (như xóa cookie rồi tải lại trang)
      expect((await sendChat({ device: newDevice(), ip })).status).toBe(200);
    }
    expect((await sendChat({ device: newDevice(), ip })).status).toBe(429);
    // không gửi cookie, hoặc gửi cookie giả chữ ký: chỉ còn trần IP và trần đó đã hết
    expect((await sendChat({ ip })).status).toBe(429);
    expect((await sendChat({ ip, cookies: ["sg_device=AAAAAAAAAAAAAAAAAAAAAA.gia-mao"] })).status).toBe(429);
  });
});
