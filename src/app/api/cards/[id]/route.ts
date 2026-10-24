import { z } from "zod";
import { idParams } from "@/core/schemas/common.schema";
import { parentCardEditSchema } from "@/core/schemas/parent-card.schema";
import { route, toActor } from "@/server/http";

export const GET = route({ auth: ["teacher", "principal"], params: idParams }, async ({ params, c, session }) => {
  const card = await c.services.parentCards.getForActor(params.id, toActor(session));
  return { card: { id: card.id, status: card.status, content: card.content } };
});

export const PATCH = route({ auth: ["teacher"], params: idParams, body: z.strictObject({ content: parentCardEditSchema }) }, async ({ body, params, c, session }) => {
  return { card: await c.services.parentCards.updateContent(params.id, body.content, toActor(session)) };
});
