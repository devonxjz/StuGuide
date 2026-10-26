import { NextResponse, type NextRequest } from "next/server";
import { getDeviceId, getDeviceQuotaCookie, DEVICE_COOKIE, DEVICE_QUOTA_COOKIE } from "@/server/http";
import { getDeviceQuotaLimiter, DEVICE_AI_LIMIT, signDeviceQuota } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const quotaCookie = getDeviceQuotaCookie(req);
  let deviceId = req.headers.get("x-device-id") || req.cookies.get(DEVICE_COOKIE)?.value || quotaCookie?.deviceId;

  if (!deviceId || deviceId.startsWith("ip:")) {
    // Luôn sinh mã định danh thực cho thiết bị để lưu cookie/localStorage
    deviceId = `dev-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }

  const baseUsed = quotaCookie?.used ?? 0;
  const quota = getDeviceQuotaLimiter().getQuota(deviceId, baseUsed);

  const res = NextResponse.json({
    deviceId,
    limit: quota.limit,
    used: quota.used,
    remaining: quota.remaining,
    isExceeded: quota.isExceeded,
    message: quota.isExceeded ? "Quá hạn sử dụng, bạn phải mua thêm lượt" : null,
  });

  const signedToken = signDeviceQuota(deviceId, quota.used, quota.isExceeded);
  res.cookies.set(DEVICE_COOKIE, deviceId, {
    path: "/",
    maxAge: 365 * 24 * 3600,
    sameSite: "lax",
    httpOnly: false,
  });
  res.cookies.set(DEVICE_QUOTA_COOKIE, signedToken, {
    path: "/",
    maxAge: 365 * 24 * 3600,
    sameSite: "lax",
    httpOnly: false,
  });

  return res;
}

export async function POST(req: NextRequest) {
  const deviceId = getDeviceId(req) || crypto.randomUUID();
  if (deviceId) {
    getDeviceQuotaLimiter().reset(deviceId);
  }
  const res = NextResponse.json({
    ok: true,
    message: "Đã làm mới lượt sử dụng AI",
    limit: DEVICE_AI_LIMIT,
    used: 0,
    remaining: DEVICE_AI_LIMIT,
    isExceeded: false,
  });

  const signedToken = signDeviceQuota(deviceId, 0, false);
  res.cookies.set(DEVICE_COOKIE, deviceId, {
    path: "/",
    maxAge: 365 * 24 * 3600,
    sameSite: "lax",
    httpOnly: false,
  });
  res.cookies.set(DEVICE_QUOTA_COOKIE, signedToken, {
    path: "/",
    maxAge: 365 * 24 * 3600,
    sameSite: "lax",
    httpOnly: false,
  });

  return res;
}
