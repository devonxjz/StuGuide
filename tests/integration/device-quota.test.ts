import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createTestContainer } from "../helpers/test-container";
import { sessionCookie } from "@/server/session";
import { GET as getQuota, POST as resetQuota } from "@/app/api/device/quota/route";
import { POST as chat } from "@/app/api/chat/route";
import { POST as familyActivity } from "@/app/api/family/activity/route";
import { POST as createPlan } from "@/app/api/plans/route";
import { GET as listConversations } from "@/app/api/conversations/route";
import { getDeviceQuotaLimiter, getRateLimiter } from "@/server/security/rate-limit";
import { AIMessage } from "@langchain/core/messages";
import { fakeModel } from "@langchain/core/testing";

let ids: Awaited<ReturnType<typeof createTestContainer>>["ids"];
let setChatModel: Awaited<ReturnType<typeof createTestContainer>>["setChatModel"];

const makeModel = (count = 20) => {
  let m = fakeModel();
  for (let i = 0; i < count; i++) {
    m = m.respond(new AIMessage(`Phản hồi AI ${i}`));
  }
  return m;
};

beforeAll(async () => {
  const t = await createTestContainer();
  ids = t.ids;
  setChatModel = t.setChatModel;
});

beforeEach(() => {
  if (ids?.teacherId) {
    getRateLimiter().reset(`ai:${ids.teacherId}`);
    getRateLimiter().reset(`ai:demo-parent-1`);
  }
  setChatModel(makeModel(25));
});

const req = (
  url: string,
  init: { method?: string; body?: unknown; user?: string; deviceId?: string; deviceCookie?: string } = {},
) => {
  const cookies: string[] = [];
  if (init.user) {
    const c = sessionCookie(init.user);
    if (c) cookies.push(`${c.name}=${c.value}`);
  }
  if (init.deviceCookie) {
    cookies.push(`sg_device_id=${init.deviceCookie}`);
  }
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cookies.length > 0) {
    headers.cookie = cookies.join("; ");
  }
  if (init.deviceId) {
    headers["x-device-id"] = init.deviceId;
  }
  return new NextRequest(`http://localhost${url}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
};

const ctx = <P,>(params: P) => ({ params: Promise.resolve(params) });

describe("Device AI Quota & Rate Limit (Tối đa 5 lượt/thiết bị)", () => {
  it("GET /api/device/quota trả về trạng thái quota ban đầu của thiết bị", async () => {
    const deviceId = "device-test-api-init";
    getDeviceQuotaLimiter().reset(deviceId);

    const r = await getQuota(req("/api/device/quota", { deviceId }));
    expect(r.status).toBe(200);
    const data = await r.json();
    expect(data).toMatchObject({
      deviceId,
      limit: 5,
      used: 0,
      remaining: 5,
      isExceeded: false,
      message: null,
    });
  });

  it("nhận diện thiết bị qua cookie sg_device_id và tự gán cookie nếu chưa có", async () => {
    // Trường hợp chưa có cookie: API trả về cookie Set-Cookie sg_device_id
    const freshRes = await getQuota(req("/api/device/quota"));
    expect(freshRes.status).toBe(200);
    expect(freshRes.cookies.get("sg_device_id")).toBeDefined();

    // Trường hợp đã có cookie: nhận diện đúng deviceId đó
    const deviceCookie = "dev-cookie-12345678";
    getDeviceQuotaLimiter().reset(deviceCookie);

    const r = await getQuota(req("/api/device/quota", { deviceCookie }));
    expect(r.status).toBe(200);
    const data = await r.json();
    expect(data.deviceId).toBe(deviceCookie);
    expect(data.limit).toBe(5);
    expect(data.used).toBe(0);
  });

  it("chặn đúng sau 5 lượt request AI, trả 429 và thông báo 'Quá hạn sử dụng, bạn phải mua thêm lượt'", async () => {
    const deviceId = "device-test-5-limit";
    getDeviceQuotaLimiter().reset(deviceId);

    // 5 lượt AI đầu tiên thành công với status 200 và header quota giảm dần
    for (let i = 1; i <= 5; i++) {
      const res = await chat(
        req("/api/chat", {
          method: "POST",
          user: ids.teacherId,
          deviceId,
          body: {
            id: `conv-quota-seq-${i}`,
            message: { id: `m-${i}`, role: "user", parts: [{ type: "text", text: `Tin nhắn ${i}` }] },
          },
        }),
        ctx({}),
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("X-Device-AI-Limit")).toBe("5");
      expect(res.headers.get("X-Device-AI-Used")).toBe(String(i));
      expect(res.headers.get("X-Device-AI-Remaining")).toBe(String(5 - i));
    }

    // Lượt thứ 6 bị chặn với mã 429, mã lỗi ERR-QUOTA-EXCEEDED và thông báo quá hạn
    const blocked6 = await chat(
      req("/api/chat", {
        method: "POST",
        user: ids.teacherId,
        deviceId,
        body: {
          id: "conv-quota-seq-6",
          message: { id: "m-6", role: "user", parts: [{ type: "text", text: "Tin nhắn thứ 6" }] },
        },
      }),
      ctx({}),
    );

    expect(blocked6.status).toBe(429);
    expect(blocked6.headers.get("Retry-After")).toBe("86400");
    expect(blocked6.headers.get("X-Device-AI-Limit")).toBe("5");
    expect(blocked6.headers.get("X-Device-AI-Remaining")).toBe("0");
    expect(blocked6.headers.get("X-Device-AI-Used")).toBe("5");

    const blockedData = await blocked6.json();
    expect(blockedData).toEqual({
      error: {
        code: "ERR-QUOTA-EXCEEDED",
        message: "Quá hạn sử dụng, bạn phải mua thêm lượt",
      },
    });

    // Lượt thứ 7 và 8 tiếp tục bị chặn triệt để (không cho truy cập thêm)
    for (const seq of [7, 8]) {
      const blockedSeq = await chat(
        req("/api/chat", {
          method: "POST",
          user: ids.teacherId,
          deviceId,
          body: {
            id: `conv-quota-seq-${seq}`,
            message: { id: `m-${seq}`, role: "user", parts: [{ type: "text", text: `Tin nhắn thứ ${seq}` }] },
          },
        }),
        ctx({}),
      );
      expect(blockedSeq.status).toBe(429);
      const data = await blockedSeq.json();
      expect(data.error.code).toBe("ERR-QUOTA-EXCEEDED");
      expect(data.error.message).toBe("Quá hạn sử dụng, bạn phải mua thêm lượt");
    }

    // Kiểm tra API quota phản ánh trạng thái isExceeded: true
    const quotaRes = await getQuota(req("/api/device/quota", { deviceId }));
    const quotaData = await quotaRes.json();
    expect(quotaData).toMatchObject({
      limit: 5,
      used: 5,
      remaining: 0,
      isExceeded: true,
      message: "Quá hạn sử dụng, bạn phải mua thêm lượt",
    });
  });

  it("chặn trên tất cả các tính năng AI khác nhau (cross-feature quota) khi thiết bị đã đạt 5 lượt", async () => {
    const deviceId = "device-test-cross-feature";
    getDeviceQuotaLimiter().reset(deviceId);

    // Sử dụng hết 5 lượt qua chat giáo viên
    for (let i = 1; i <= 5; i++) {
      const res = await chat(
        req("/api/chat", {
          method: "POST",
          user: ids.teacherId,
          deviceId,
          body: {
            id: `conv-cross-${i}`,
            message: { id: `m-cross-${i}`, role: "user", parts: [{ type: "text", text: `Tin nhắn ${i}` }] },
          },
        }),
        ctx({}),
      );
      expect(res.status).toBe(200);
    }

    // 1. Thử gọi API gợi ý hoạt động gia đình (/api/family/activity) -> BỊ CHẶN 429
    const blockedFamilyActivity = await familyActivity(
      req("/api/family/activity", {
        method: "POST",
        user: "demo-parent-1",
        deviceId,
        body: { studentId: ids.huyId },
      }),
      ctx({}),
    );
    expect(blockedFamilyActivity.status).toBe(429);
    const familyData = await blockedFamilyActivity.json();
    expect(familyData).toEqual({
      error: {
        code: "ERR-QUOTA-EXCEEDED",
        message: "Quá hạn sử dụng, bạn phải mua thêm lượt",
      },
    });

    // 2. Thử gọi API tạo giáo án AI (/api/plans) -> BỊ CHẶN 429
    const blockedPlan = await createPlan(
      req("/api/plans", {
        method: "POST",
        user: ids.teacherId,
        deviceId,
        body: {
          ageGroup: "4-5y",
          developmentArea: "physical",
          topic: "Bài thể dục sáng",
          materials: ["Bóng nhựa"],
          duration: 20,
          space: "indoor",
        },
      }),
      ctx({}),
    );
    expect(blockedPlan.status).toBe(429);
    const planData = await blockedPlan.json();
    expect(planData).toEqual({
      error: {
        code: "ERR-QUOTA-EXCEEDED",
        message: "Quá hạn sử dụng, bạn phải mua thêm lượt",
      },
    });
  });

  it("các API không phải AI (non-AI routes) vẫn hoạt động bình thường kể cả khi đã hết hạn mức AI", async () => {
    const deviceId = "device-test-non-ai";
    getDeviceQuotaLimiter().reset(deviceId);

    // Dùng hết 5 lượt AI
    for (let i = 1; i <= 5; i++) {
      await chat(
        req("/api/chat", {
          method: "POST",
          user: ids.teacherId,
          deviceId,
          body: {
            id: `conv-nonai-${i}`,
            message: { id: `m-${i}`, role: "user", parts: [{ type: "text", text: `Hỏi ${i}` }] },
          },
        }),
        ctx({}),
      );
    }

    // GET /api/device/quota vẫn trả 200 OK
    const quotaRes = await getQuota(req("/api/device/quota", { deviceId }));
    expect(quotaRes.status).toBe(200);

    // GET /api/conversations vẫn trả 200 OK (không bị chặn)
    const convRes = await listConversations(req("/api/conversations", { user: ids.teacherId, deviceId }), ctx({}));
    expect(convRes.status).toBe(200);
  });

  it("cô lập hạn mức hoàn toàn giữa các thiết bị khác nhau (Device Isolation)", async () => {
    const deviceA = "device-isolated-AAA1";
    const deviceB = "device-isolated-BBB2";
    getDeviceQuotaLimiter().reset(deviceA);
    getDeviceQuotaLimiter().reset(deviceB);

    // Thiết bị A dùng hết 5 lượt
    for (let i = 1; i <= 5; i++) {
      const resA = await chat(
        req("/api/chat", {
          method: "POST",
          user: ids.teacherId,
          deviceId: deviceA,
          body: {
            id: `conv-iso-a-${i}`,
            message: { id: `m-a-${i}`, role: "user", parts: [{ type: "text", text: `Tin nhắn A ${i}` }] },
          },
        }),
        ctx({}),
      );
      expect(resA.status).toBe(200);
    }

    // Thiết bị A gửi tiếp lần 6 -> Bị chặn 429
    const blockedA = await chat(
      req("/api/chat", {
        method: "POST",
        user: ids.teacherId,
        deviceId: deviceA,
        body: {
          id: "conv-iso-a-6",
          message: { id: "m-a-6", role: "user", parts: [{ type: "text", text: "Tin nhắn A lần 6" }] },
        },
      }),
      ctx({}),
    );
    expect(blockedA.status).toBe(429);

    // Thiết bị B gửi request lần 1 -> THÀNH CÔNG 200, không bị ảnh hưởng bởi thiết bị A
    const resB = await chat(
      req("/api/chat", {
        method: "POST",
        user: ids.teacherId,
        deviceId: deviceB,
        body: {
          id: "conv-iso-b-1",
          message: { id: "m-b-1", role: "user", parts: [{ type: "text", text: "Tin nhắn B lần 1" }] },
        },
      }),
      ctx({}),
    );
    expect(resB.status).toBe(200);
    expect(resB.headers.get("X-Device-AI-Used")).toBe("1");
    expect(resB.headers.get("X-Device-AI-Remaining")).toBe("4");
  });

  it("reset quota mở khóa và cho phép tiếp tục truy cập các tính năng AI", async () => {
    const deviceId = "device-test-reset-flow";
    getDeviceQuotaLimiter().reset(deviceId);

    // Dùng hết 5 lượt
    for (let i = 1; i <= 5; i++) {
      await chat(
        req("/api/chat", {
          method: "POST",
          user: ids.teacherId,
          deviceId,
          body: {
            id: `conv-rst-${i}`,
            message: { id: `m-${i}`, role: "user", parts: [{ type: "text", text: `Tin ${i}` }] },
          },
        }),
        ctx({}),
      );
    }

    // Đang bị chặn
    const blocked = await chat(
      req("/api/chat", {
        method: "POST",
        user: ids.teacherId,
        deviceId,
        body: {
          id: "conv-rst-blocked",
          message: { id: "m-blk", role: "user", parts: [{ type: "text", text: "Tin bị chặn" }] },
        },
      }),
      ctx({}),
    );
    expect(blocked.status).toBe(429);

    // Reset quota qua API POST /api/device/quota
    const resetRes = await resetQuota(req("/api/device/quota", { method: "POST", deviceId }));
    expect(resetRes.status).toBe(200);
    const resetData = await resetRes.json();
    expect(resetData).toMatchObject({
      ok: true,
      limit: 5,
      used: 0,
      remaining: 5,
      isExceeded: false,
    });

    // Sau khi reset, thiết bị có thể tiếp tục tương tác bình thường
    const unblocked = await chat(
      req("/api/chat", {
        method: "POST",
        user: ids.teacherId,
        deviceId,
        body: {
          id: "conv-rst-success",
          message: { id: "m-ok", role: "user", parts: [{ type: "text", text: "Tin sau reset" }] },
        },
      }),
      ctx({}),
    );
    expect(unblocked.status).toBe(200);
    expect(unblocked.headers.get("X-Device-AI-Used")).toBe("1");
    expect(unblocked.headers.get("X-Device-AI-Remaining")).toBe("4");
  });
});
