import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Role } from "@/core/constants/status";
import type { Actor } from "@/services/types";
import { getContainer } from "./container";
import { getSessionSecret, SESSION_TTL_SECONDS, signSession, verifySession } from "./session-token";

export const SESSION_COOKIE = "sg_session";

export interface Session extends Actor {
  fullName: string;
  schoolId: string;
  schoolName: string;
  className?: string;
  ageLabel?: string;
}

export const sessionCookie = (userId: string, sessionVersion = 0) => ({
  name: SESSION_COOKIE,
  value: signSession({ sub: userId, sv: sessionVersion }, getSessionSecret()),
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  },
});

/**
 * Giải mã cookie -> Session (dùng chung cho route handler và server component).
 * Lớp kiểm tra thứ hai sau proxy: chữ ký + hạn dùng, rồi đối chiếu DB (tài khoản còn tồn tại, phiên bản phiên chưa bị thu hồi).
 */
export async function resolveSession(cookieValue: string | undefined): Promise<Session | null> {
  const claims = verifySession(cookieValue, getSessionSecret());
  if (!claims) return null;
  const { repos } = await getContainer();
  const user = await repos.users.findById(claims.sub);
  if (!user || user.sessionVersion !== claims.sv) return null;
  const [cls, schoolName] = await Promise.all([
    user.role === "teacher" ? repos.users.classOfTeacher(user.id) : null,
    repos.users.schoolName(user.schoolId),
  ]);
  return {
    id: user.id,
    role: user.role as Role,
    fullName: user.fullName,
    schoolId: user.schoolId,
    schoolName: schoolName ?? "",
    classId: cls?.id,
    className: cls?.name,
    ageLabel: cls?.ageLabel,
  };
}

/** Cho server component: chưa đăng nhập hoặc sai vai trò thì đưa về /login. */
export async function requireSession(roles?: Role[]): Promise<Session> {
  const session = await resolveSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session || (roles && !roles.includes(session.role))) redirect("/login");
  return session;
}
