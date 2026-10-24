import { z } from "zod";
import { idSchema } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

export const POST = route({ auth: ["teacher"], body: z.strictObject({ planId: idSchema }), rateLimit: "ai" }, async ({ body, c, session }) => {
  return { card: await c.services.parentCards.generate(body.planId, toActor(session)) };
});
