import { idParams } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

export const DELETE = route({ auth: ["parent"], params: idParams }, async ({ params, c, session }) => {
  await c.family.profiles.forget(toActor(session), params.id);
  return { ok: true };
});
