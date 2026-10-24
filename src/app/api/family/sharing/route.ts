import { z } from "zod";
import { idSchema } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

/** Phụ huynh đồng ý / thu hồi việc chia sẻ hồ sơ cá nhân hóa của bé với cô giáo. */
export const POST = route({ auth: ["parent"], body: z.strictObject({ studentId: idSchema, shared: z.boolean() }) }, async ({ body, c, session }) => {
  return c.family.profiles.setSharing(toActor(session), body.studentId, body.shared);
});
