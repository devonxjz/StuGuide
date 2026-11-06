import { NextResponse } from "next/server";
import { z } from "zod";
import { idSchema } from "@/core/schemas/common.schema";
import { route } from "@/server/http";
import { CLASS_COOKIE } from "@/server/session";

/** Chuyển khu vực làm việc sang một lớp mà giáo viên đang phụ trách. */
export const POST = route(
  { auth: ["teacher"], body: z.object({ classId: idSchema }) },
  async ({ session, body }) => {
    if (!session.classes.some((c) => c.id === body.classId)) {
      return NextResponse.json({ error: { code: "ERR-AUTH-01", message: "Bạn không phụ trách lớp này" } }, { status: 403 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(CLASS_COOKIE, body.classId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  },
);
