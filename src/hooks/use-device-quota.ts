"use client";

import { useCallback, useEffect, useState } from "react";
import { clearLegacyStorage, DEVICE_QUOTA_EVENT, publishQuota, readCachedQuota, type DeviceQuota } from "@/lib/device-quota";

export type { DeviceQuota };

/**
 * Số lượt AI còn lại để hiển thị. Lần đầu lấy từ cache cho nhanh, rồi hỏi lại server (nguồn sự thật);
 * sau đó tự cập nhật mỗi khi có phản hồi API mang số lượt mới (sự kiện DEVICE_QUOTA_EVENT).
 */
export function useDeviceQuota() {
  const [quota, setQuota] = useState<DeviceQuota>(readCachedQuota);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/device/quota");
      if (res.ok) publishQuota((await res.json()) as DeviceQuota);
    } catch {
      // lỗi mạng: giữ nguyên số đang hiển thị
    }
  }, []);

  useEffect(() => {
    clearLegacyStorage();
    const onUpdate = (event: Event) => setQuota((event as CustomEvent<DeviceQuota>).detail);
    window.addEventListener(DEVICE_QUOTA_EVENT, onUpdate);
    void refresh();
    return () => window.removeEventListener(DEVICE_QUOTA_EVENT, onUpdate);
  }, [refresh]);

  return { quota, refresh };
}
