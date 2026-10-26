// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useDeviceQuota } from "@/hooks/use-device-quota";
import { DEFAULT_QUOTA, makeQuota, publishQuota } from "@/lib/device-quota";

const serverSays = (body: unknown, ok = true) => vi.stubGlobal("fetch", vi.fn(async () => ({ ok, json: async () => body })));

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useDeviceQuota", () => {
  it("hiện ngay số lượt trong cache, rồi cập nhật theo server (server là nguồn sự thật)", async () => {
    localStorage.setItem("sg_device_quota", JSON.stringify(makeQuota(5, 5, 0)));
    serverSays(makeQuota(5, 1, 4));

    const { result } = renderHook(() => useDeviceQuota());
    expect(result.current.quota.isExceeded).toBe(true);

    await waitFor(() => expect(result.current.quota).toEqual(makeQuota(5, 1, 4)));
    expect(fetch).toHaveBeenCalledWith("/api/device/quota");
  });

  it("máy từng bị bản cũ khóa nhầm (cờ sg_device_blocked sau 429 do bấm quá nhanh): mở lại theo server và dọn cờ", async () => {
    localStorage.setItem("sg_device_blocked", "true");
    localStorage.setItem("sg_device_quota", JSON.stringify(makeQuota(5, 5, 0)));
    serverSays(makeQuota(5, 1, 4));

    const { result } = renderHook(() => useDeviceQuota());

    await waitFor(() => expect(result.current.quota.isExceeded).toBe(false));
    expect(result.current.quota.remaining).toBe(4);
    expect(localStorage.getItem("sg_device_blocked")).toBeNull();
  });

  it("server trả lỗi: giữ nguyên số đang hiển thị", async () => {
    serverSays({}, false);
    const { result } = renderHook(() => useDeviceQuota());
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(result.current.quota).toEqual(DEFAULT_QUOTA);
  });

  it("lỗi mạng: giữ nguyên số đang hiển thị, không ném lỗi", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    const { result } = renderHook(() => useDeviceQuota());
    await act(() => result.current.refresh());
    expect(result.current.quota).toEqual(DEFAULT_QUOTA);
  });

  it("cập nhật khi nơi khác phát số lượt mới (vd. vừa gọi API AI xong)", async () => {
    serverSays(DEFAULT_QUOTA);
    const { result } = renderHook(() => useDeviceQuota());
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    act(() => publishQuota(makeQuota(5, 3, 2)));
    expect(result.current.quota).toEqual(makeQuota(5, 3, 2));
  });

  it("gỡ listener khi unmount", async () => {
    serverSays(DEFAULT_QUOTA);
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useDeviceQuota());
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    unmount();
    expect(remove).toHaveBeenCalledWith("sg:device-quota-updated", expect.any(Function));
  });
});
