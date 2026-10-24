import { route, toActor } from "@/server/http";

export const GET = route({ auth: ["teacher"] }, async ({ c, session }) => ({ conversations: await c.conversations.list(toActor(session)) }));
