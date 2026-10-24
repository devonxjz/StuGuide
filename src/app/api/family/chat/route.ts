import { createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { idSchema } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

export const maxDuration = 180;

const bodySchema = z.strictObject({
  studentId: idSchema,
  /** Cửa sổ hội thoại do client giữ trong RAM (bộ nhớ ngắn hạn); server không lưu từng lượt */
  turns: z
    .array(z.strictObject({ role: z.enum(["parent", "assistant"]), text: z.string().trim().min(1).max(4000, "Tin nhắn tối đa 4000 ký tự") }))
    .min(1)
    .max(60)
    .refine((t) => t[t.length - 1]?.role === "parent", "Lượt cuối phải là tin nhắn của bố mẹ"),
});

export const POST = route({ auth: ["parent"], body: bodySchema, rateLimit: "ai" }, async ({ req, body, c, session }) => {
  const stream = await c.family.assistant.createUiStream({ actor: toActor(session), studentId: body.studentId, turns: body.turns, signal: req.signal });
  return createUIMessageStreamResponse({ stream });
});
