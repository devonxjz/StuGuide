import { z } from "zod";
import { idSchema, lineText } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

const bodySchema = z.strictObject({ studentId: idSchema, content: lineText(200).refine((s) => s.length >= 3, "Nội dung ghi nhớ tối thiểu 3 ký tự") });

export const POST = route({ auth: ["parent"], body: bodySchema }, async ({ body, c, session }) => {
  return { memory: await c.family.profiles.remember(toActor(session), body.studentId, body.content, "parent") };
});
