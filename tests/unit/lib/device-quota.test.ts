// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  clearLegacyStorage,
  DEFAULT_QUOTA,
  DEVICE_QUOTA_EVENT,
  makeQuota,
  publishQuota,
  quotaAwareFetch,
  quotaFromHeaders,
  readCachedQuota,
  syncQuotaFromResponse,
  type DeviceQuota,
} from "@/lib/device-quota";

const MESSAGE = "Quá hạn sử dụng, bạn phải mua thêm lượt";

const quotaHeaders = (limit: number, used: number, remaining: number) => ({
  "x-device-ai-limit": String(limit),
  "x-device-ai-used": String(used),
  "x-device-ai-remaining": String(remaining),
});

/** Gom các sự kiện số lượt được phát ra trong một test */
const listen = () => {
  const received: DeviceQuota[] = [];
  const onUpdate = (e: Event) => received.push((e as CustomEvent<DeviceQuota>).detail);
  window.addEventListener(DEVICE_QUOTA_EVENT, onUpdate);
  return { received, stop: () => window.removeEventListener(DEVICE_QUOTA_EVENT, onUpdate) };
};

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("makeQuota", () => {
  it("còn lượt: không có thông điệp", () => {
    expect(makeQuota(5, 2, 3)).toEqual({ limit: 5, used: 2, remaining: 3, isExceeded: false, message: null });
  });

  it("hết lượt: kèm thông điệp; số âm được đưa về 0", () => {
    expect(makeQuota(5, 5, 0)).toEqual({ limit: 5, used: 5, remaining: 0, isExceeded: true, message: MESSAGE });
    expect(makeQuota(5, 5, -2).remaining).toBe(0);
  });
});

describe("publishQuota / readCachedQuota", () => {
  it("chưa có cache: dùng mặc định", () => {
    expect(readCachedQuota()).toEqual(DEFAULT_QUOTA);
  });

  it("phát sự kiện và lưu cache để lần tải trang sau đọc lại", () => {
    const events = listen();
    const quota = makeQuota(5, 4, 1);
    publishQuota(quota);
    events.stop();

    expect(events.received).toEqual([quota]);
    expect(readCachedQuota()).toEqual(quota);
  });

  it("cache hỏng (JSON sai) hoặc sai cấu trúc: dùng mặc định", () => {
    localStorage.setItem("sg_device_quota", "{không phải json");
    expect(readCachedQuota()).toEqual(DEFAULT_QUOTA);
    localStorage.setItem("sg_device_quota", JSON.stringify({ limit: "5", used: 0 }));
    expect(readCachedQuota()).toEqual(DEFAULT_QUOTA);
    localStorage.setItem("sg_device_quota", "null");
    expect(readCachedQuota()).toEqual(DEFAULT_QUOTA);
  });

  it("localStorage bị chặn: vẫn phát sự kiện, đọc cache trả mặc định", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const events = listen();
    publishQuota(makeQuota(5, 1, 4));
    events.stop();

    expect(events.received).toHaveLength(1);
    expect(readCachedQuota()).toEqual(DEFAULT_QUOTA);
  });
});

describe("clearLegacyStorage", () => {
  it("xóa cờ khóa và id thiết bị của bản cũ, giữ cache số lượt", () => {
    localStorage.setItem("sg_device_blocked", "true");
    localStorage.setItem("sg_device_id", "dev-1234567890abcdef");
    localStorage.setItem("sg_device_quota", JSON.stringify(makeQuota(5, 1, 4)));

    clearLegacyStorage();

    expect(localStorage.getItem("sg_device_blocked")).toBeNull();
    expect(localStorage.getItem("sg_device_id")).toBeNull();
    expect(readCachedQuota()).toEqual(makeQuota(5, 1, 4));
  });

  it("localStorage bị chặn: không ném lỗi", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => clearLegacyStorage()).not.toThrow();
  });
});

describe("quotaFromHeaders / syncQuotaFromResponse", () => {
  it("đọc đủ 3 header X-Device-AI-*", () => {
    expect(quotaFromHeaders(new Headers(quotaHeaders(5, 3, 2)))).toEqual(makeQuota(5, 3, 2));
  });

  it("thiếu hoặc sai header (phản hồi không phải AI, 429 do bấm quá nhanh): null", () => {
    expect(quotaFromHeaders(new Headers())).toBeNull();
    expect(quotaFromHeaders(new Headers({ ...quotaHeaders(5, 3, 2), "x-device-ai-used": "abc" }))).toBeNull();
    expect(quotaFromHeaders(new Headers({ "x-device-ai-limit": "5", "x-device-ai-used": "1" }))).toBeNull();
  });

  it("chỉ phát số lượt khi phản hồi có header", () => {
    const events = listen();
    expect(syncQuotaFromResponse(new Response(null, { headers: quotaHeaders(5, 1, 4) }))).toEqual(makeQuota(5, 1, 4));
    expect(syncQuotaFromResponse(new Response(null, { status: 429 }))).toBeNull();
    events.stop();
    expect(events.received).toEqual([makeQuota(5, 1, 4)]);
  });

  it("đối tượng phản hồi không có headers: bỏ qua, không ném lỗi", () => {
    expect(syncQuotaFromResponse({})).toBeNull();
  });
});

describe("quotaAwareFetch (fetch cho khung chat)", () => {
  const stubFetch = (res: Response) => vi.stubGlobal("fetch", vi.fn(async () => res));

  it("phản hồi thành công: trả nguyên Response và cập nhật số lượt", async () => {
    const res = new Response("ok", { headers: quotaHeaders(5, 2, 3) });
    stubFetch(res);
    expect(await quotaAwareFetch("/api/chat", { method: "POST" })).toBe(res);
    expect(readCachedQuota()).toEqual(makeQuota(5, 2, 3));
    expect(fetch).toHaveBeenCalledWith("/api/chat", { method: "POST" });
  });

  it("429 hết lượt: ném ApiError với mã + thông điệp của server và lưu trạng thái hết lượt", async () => {
    stubFetch(Response.json({ error: { code: "ERR-QUOTA-EXCEEDED", message: MESSAGE } }, { status: 429, headers: quotaHeaders(5, 5, 0) }));
    await expect(quotaAwareFetch("/api/chat")).rejects.toMatchObject({ code: "ERR-QUOTA-EXCEEDED", message: MESSAGE, status: 429 });
    expect(readCachedQuota().isExceeded).toBe(true);
  });

  it("429 do bấm quá nhanh: ném đúng thông điệp rate limit, KHÔNG đánh dấu hết lượt", async () => {
    stubFetch(Response.json({ error: { code: "ERR-RATE-01", message: "Thao tác quá nhanh, vui lòng thử lại sau 30 giây" } }, { status: 429 }));
    await expect(quotaAwareFetch("/api/chat")).rejects.toMatchObject({ code: "ERR-RATE-01", message: "Thao tác quá nhanh, vui lòng thử lại sau 30 giây" });
    expect(readCachedQuota()).toEqual(DEFAULT_QUOTA);
  });

  it("lỗi HTTP khác (input sai, lỗi server) cũng thành ApiError", async () => {
    stubFetch(Response.json({ error: { code: "ERR-INPUT-01", message: "Tin nhắn không hợp lệ" } }, { status: 400 }));
    await expect(quotaAwareFetch("/api/chat")).rejects.toMatchObject({ code: "ERR-INPUT-01", status: 400 });

    stubFetch(new Response("boom", { status: 500 }));
    await expect(quotaAwareFetch("/api/chat")).rejects.toMatchObject({ code: "ERR-INTERNAL", status: 500 });
  });
});
