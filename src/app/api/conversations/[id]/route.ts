import { z } from "zod";
import { route, toActor } from "@/server/http";

const params = z.strictObject({ id: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "Mã cuộc trò chuyện không hợp lệ") });

export const GET = route({ auth: ["teacher"], params }, async ({ params, c, session }) => c.conversations.load(toActor(session), params.id));

export const DELETE = route({ auth: ["teacher"], params }, async ({ params, c, session }) => {
  await c.conversations.remove(toActor(session), params.id);
  return { ok: true };
});
