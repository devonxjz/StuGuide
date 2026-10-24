import { idParams } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

export const DELETE = route({ auth: ["teacher"], params: idParams }, async ({ params, c, session }) => {
  await c.conversations.forget(toActor(session), params.id);
  return { ok: true };
});
