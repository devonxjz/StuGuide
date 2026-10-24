import { NextResponse } from "next/server";
import { emptyBody } from "@/core/schemas/common.schema";
import { route } from "@/server/http";
import { SESSION_COOKIE } from "@/server/session";

/** Đăng xuất = thu hồi phiên phía server (tăng sessionVersion) để cookie đã bị lộ cũng mất hiệu lực, rồi xóa cookie. */
export const POST = route({ auth: "public", body: emptyBody }, async ({ c, session }) => {
  if (session) {
    await c.repos.users.revokeSessions(session.id);
    await c.repos.audit.log({ userId: session.id, action: "logout" });
  }
  const res = NextResponse.json({ redirect: "/login" });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
