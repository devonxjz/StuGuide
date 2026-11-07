import { NextResponse } from "next/server";
import { createClassBodySchema } from "@/core/schemas/class.schema";
import { route, toActor } from "@/server/http";
import { CLASS_COOKIE } from "@/server/session";

/** Thêm lớp mới kèm danh sách bé + phụ huynh (đã đọc từ CSV/Excel ở trình duyệt), rồi chuyển khu vực làm việc sang lớp đó. */
export const POST = route({ auth: ["teacher"], body: createClassBodySchema }, async ({ body, c, session }) => {
  const result = await c.services.classes.create(toActor(session), body);
  const res = NextResponse.json(result, { status: 201 });
  res.cookies.set(CLASS_COOKIE, result.classId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
});
