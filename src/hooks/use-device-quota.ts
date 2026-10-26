"use client";

import { useEffect, useState, useCallback } from "react";
import { getClientDeviceId } from "@/lib/api-client";

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

const getInitialQuota = (): DeviceQuota => {
  if (typeof window === "undefined") {
    return { limit: 5, used: 0, remaining: 5, isExceeded: false, message: null };
  }
  try {
    const isBlocked = localStorage.getItem("sg_device_blocked") === "true";
    const raw = localStorage.getItem("sg_device_quota");
    if (raw) {
      const parsed = JSON.parse(raw) as DeviceQuota;
      if (isBlocked) {
        parsed.isExceeded = true;
        parsed.used = Math.max(parsed.used, parsed.limit);
        parsed.remaining = 0;
        parsed.message = "Quá hạn sử dụng, bạn phải mua thêm lượt";
      }
      return parsed;
    }
    if (isBlocked) {
      return { limit: 5, used: 5, remaining: 0, isExceeded: true, message: "Quá hạn sử dụng, bạn phải mua thêm lượt" };
    }
  } catch {}
  return { limit: 5, used: 0, remaining: 5, isExceeded: false, message: null };
};

export function useDeviceQuota() {
  const [quota, setQuota] = useState<DeviceQuota>(getInitialQuota);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const deviceId = getClientDeviceId();
      const res = await fetch("/api/device/quota", {
        headers: deviceId ? { "x-device-id": deviceId } : undefined,
      });
      if (!res.ok) return;
      const data = (await res.json()) as DeviceQuota;
      const wasBlocked = typeof window !== "undefined" && localStorage.getItem("sg_device_blocked") === "true";
      if (wasBlocked) {
        data.isExceeded = true;
        data.used = Math.max(data.used, data.limit);
        data.remaining = 0;
        data.message = "Quá hạn sử dụng, bạn phải mua thêm lượt";
      }
      if (data.isExceeded) {
        try {
          localStorage.setItem("sg_device_blocked", "true");
        } catch {}
      }
      try {
        localStorage.setItem("sg_device_quota", JSON.stringify(data));
      } catch {}
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
