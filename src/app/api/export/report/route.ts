import { route, toActor } from "@/server/http";

export const GET = route({ auth: ["principal"] }, async ({ c, session }) => {
  return c.services.reports.exportReport(toActor(session));
});
