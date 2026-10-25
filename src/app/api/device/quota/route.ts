import { NextResponse, type NextRequest } from "next/server";
import { getDeviceId, DEVICE_COOKIE } from "@/server/http";
import { getDeviceQuotaLimiter, DEVICE_AI_LIMIT } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const existingId = getDeviceId(req);
  const deviceId = existingId ?? crypto.randomUUID();
  const quota = getDeviceQuotaLimiter().getQuota(deviceId);

  const res = NextResponse.json({
    deviceId,
    limit: quota.limit,
    used: quota.used,
    remaining: quota.remaining,
    isExceeded: quota.isExceeded,
    message: quota.isExceeded ? "Quá hạn sử dụng, bạn phải mua thêm lượt" : null,
  });

  if (!req.cookies.has(DEVICE_COOKIE) && !deviceId.startsWith("ip:")) {
    res.cookies.set(DEVICE_COOKIE, deviceId, {
      path: "/",
      maxAge: 365 * 24 * 3600,
      sameSite: "lax",
      httpOnly: false,
    });
  }

  return res;
}

export async function POST(req: NextRequest) {
  const deviceId = getDeviceId(req);
  if (deviceId) {
    getDeviceQuotaLimiter().reset(deviceId);
  }
  return NextResponse.json({
    ok: true,
    message: "Đã làm mới lượt sử dụng AI",
    limit: DEVICE_AI_LIMIT,
    used: 0,
    remaining: DEVICE_AI_LIMIT,
    isExceeded: false,
  });
}
