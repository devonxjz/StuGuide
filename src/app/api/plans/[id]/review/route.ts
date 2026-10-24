import { z } from "zod";
import { idParams } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

/** Giáo viên gửi BGH duyệt; chỉ BGH được yêu cầu sửa lại (kiểm tra vai trò trong service). */
export const POST = route(
  { auth: ["teacher", "principal"], params: idParams, body: z.strictObject({ action: z.enum(["submit", "request-changes"]) }) },
  async ({ body, params, c, session }) => {
    const actor = toActor(session);
    const plan = body.action === "submit" ? await c.services.lessonPlanner.submitForReview(params.id, actor) : await c.services.lessonPlanner.requestChanges(params.id, actor);
    return { plan };
  },
);
