import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Role } from "@/core/constants/status";
import type { Actor } from "@/services/types";
import { getContainer } from "./container";
import { getSessionSecret, SESSION_TTL_SECONDS, signSession, verifySession } from "./session-token";

export const SESSION_COOKIE = "sg_session";
/** Lớp (khu vực làm việc) giáo viên đang chọn. Không cần ký: luôn được đối chiếu với các lớp giáo viên phụ trách. */
export const CLASS_COOKIE = "sg_class";

export interface Session extends Actor {
  fullName: string;
  schoolId: string;
  schoolName: string;
  className?: string;
  ageLabel?: string;
  /** Mọi lớp giáo viên phụ trách, để chuyển khu vực làm việc. */
  classes: { id: string; name: string }[];
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
export async function resolveSession(cookieValue: string | undefined, classCookie?: string): Promise<Session | null> {
  const claims = verifySession(cookieValue, getSessionSecret());
  if (!claims) return null;
  const { repos } = await getContainer();
  const user = await repos.users.findById(claims.sub);
  if (!user || user.sessionVersion !== claims.sv) return null;
  const [classes, schoolName] = await Promise.all([
    user.role === "teacher" ? repos.users.classesOfTeacher(user.id) : [],
    repos.users.schoolName(user.schoolId),
  ]);
  // Lớp đã chọn nếu còn phụ trách, ngược lại lớp đầu tiên
  const cls = classes.find((c) => c.id === classCookie) ?? classes[0];
  return {
    id: user.id,
    role: user.role as Role,
    fullName: user.fullName,
    schoolId: user.schoolId,
    schoolName: schoolName ?? "",
    classId: cls?.id,
    className: cls?.name,
    ageLabel: cls?.ageLabel,
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
  };
}

/** Cho server component: chưa đăng nhập hoặc sai vai trò thì đưa về /login. */
export async function requireSession(roles?: Role[]): Promise<Session> {
  const jar = await cookies();
  const session = await resolveSession(jar.get(SESSION_COOKIE)?.value, jar.get(CLASS_COOKIE)?.value);
  if (!session || (roles && !roles.includes(session.role))) redirect("/login");
  return session;
}
