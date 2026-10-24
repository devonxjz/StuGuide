import { z } from "zod";
import { idParams, paragraph } from "@/core/schemas/common.schema";
import { EDITABLE_SECTIONS } from "@/core/schemas/lesson-plan.schema";
import { route, toActor } from "@/server/http";

export const maxDuration = 120;

const bodySchema = z.strictObject({ section: z.enum(EDITABLE_SECTIONS), instruction: paragraph(1000).optional() });

/** 🔄 AI viết lại phần này (chấm theo tiêu chí, tự sửa), giữ nguyên các phần còn lại. */
export const POST = route({ auth: ["teacher"], params: idParams, body: bodySchema, rateLimit: "ai" }, async ({ body, params, c, session }) => {
  return { plan: await c.services.lessonPlanner.rewriteSection(params.id, body.section, body.instruction, toActor(session)) };
});
