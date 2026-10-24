import { idParams } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

export const GET = route({ auth: ["teacher", "principal"], params: idParams }, async ({ params, c, session }) => {
  return c.services.parentCards.statsForActor(params.id, toActor(session));
});
