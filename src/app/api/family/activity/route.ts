import { z } from "zod";
import { idSchema, paragraph } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

export const maxDuration = 120;

/** Gợi ý hoạt động tối nay cá nhân hóa bằng một chạm. */
export const POST = route({ auth: ["parent"], body: z.strictObject({ studentId: idSchema, focus: paragraph(300).optional() }), rateLimit: "ai" }, async ({ body, c, session }) => {
  return { activity: await c.family.assistant.suggestTonight(toActor(session), body.studentId, body.focus) };
});
