import { z } from "zod";
import { lineText } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

export const GET = route({ auth: ["teacher"] }, async ({ c, session }) => ({ memories: await c.conversations.memories(toActor(session)) }));

const bodySchema = z.strictObject({ content: lineText(300).refine((s) => s.length >= 3, "Nội dung ghi nhớ tối thiểu 3 ký tự") });

export const POST = route({ auth: ["teacher"], body: bodySchema }, async ({ body, c, session }) => {
  return { memory: await c.conversations.remember(toActor(session), body.content) };
});
