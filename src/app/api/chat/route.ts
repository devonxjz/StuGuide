import { createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { route, toActor } from "@/server/http";
import type { StuGuideMessage } from "@/types/chat";

export const maxDuration = 180;

const clientId = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "Mã không hợp lệ");

const bodySchema = z.strictObject({
  /** id cuộc trò chuyện (UUID do client sinh khi bắt đầu chat mới) */
  id: clientId,
  /** Chỉ tin nhắn mới nhất của cô; lịch sử và trí nhớ do server giữ */
  message: z.object({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "Mã tin nhắn không hợp lệ"),
    role: z.literal("user"),
    parts: z.array(z.object({ type: z.literal("text"), text: z.string().trim().min(1, "Tin nhắn trống").max(4000, "Tin nhắn tối đa 4000 ký tự") })).min(1).max(5),
  }),
});

/** Chatbot của giáo viên: stream văn bản + thẻ kết quả + tiến trình các bước. */
export const POST = route({ auth: ["teacher"], body: bodySchema, rateLimit: "ai" }, async ({ req, body, c, session }) => {
  const message = { id: body.message.id, role: "user", parts: body.message.parts.map((p) => ({ type: "text", text: p.text })) } as StuGuideMessage;
  const stream = await c.chat.createUiStream({ conversationId: body.id, message, actor: toActor(session), signal: req.signal });
  return createUIMessageStreamResponse({ stream });
});
