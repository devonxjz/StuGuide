"use client";

import { useEffect, useState, useCallback } from "react";

export interface DeviceQuota {
  limit: number;
  used: number;
  remaining: number;
  isExceeded: boolean;
  message: string | null;
}

export const DEVICE_QUOTA_EVENT = "sg:device-quota-updated";

export function broadcastDeviceQuota(quota: DeviceQuota) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DEVICE_QUOTA_EVENT, { detail: quota }));
  }
}

export function useDeviceQuota() {
  const [quota, setQuota] = useState<DeviceQuota>({
    limit: 5,
    used: 0,
    remaining: 5,
    isExceeded: false,
    message: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/device/quota");
      if (!res.ok) return;
      const data = (await res.json()) as DeviceQuota;
      setQuota(data);
      broadcastDeviceQuota(data);
    } catch {
      // Bỏ qua lỗi mạng
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<DeviceQuota>;
      if (customEvent.detail) {
        setQuota(customEvent.detail);
        setLoading(false);
      }
    };

    window.addEventListener(DEVICE_QUOTA_EVENT, handler);
    return () => window.removeEventListener(DEVICE_QUOTA_EVENT, handler);
  }, [refresh]);

  return { quota, loading, refresh };
}
