import { emptyBody, idParams } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

export const POST = route({ auth: ["teacher"], params: idParams, body: emptyBody, rateLimit: "ai" }, async ({ params, c, session }) => {
  const { checklist, criteria } = await c.services.assessment.createChecklist(params.id, toActor(session));
  return { checklistId: checklist.id, criteria };
});
