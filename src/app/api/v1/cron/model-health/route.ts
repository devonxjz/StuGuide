import { NextResponse } from "next/server";
import { resolveAiConfig } from "@/ai/config";
import { checkModelHealth, logHealthReport } from "@/ai/model-health";
import { route } from "@/server/http";
import { isCronAuthorized } from "@/server/security/cron-auth";

export const dynamic = "force-dynamic";

const error = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });

/**
 * Health check hằng ngày (Vercel Cron, xem vercel.json) cho các model đã pin: báo khi model bị gỡ/deprecate.
 * Không dùng phiên người dùng; xác thực bằng CRON_SECRET. Trả 503 khi có model không ổn để hệ thống giám sát cảnh báo.
 */
export const GET = route({ auth: "public" }, async ({ req }) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return error(503, "ERR-CRON-01", "Chưa cấu hình CRON_SECRET");
  if (!isCronAuthorized(req.headers.get("authorization"), secret)) return error(401, "ERR-AUTH-01", "Không được phép");

  const report = await checkModelHealth(resolveAiConfig());
  logHealthReport(report);
  return NextResponse.json(report, { status: report.healthy ? 200 : 503 });
});
