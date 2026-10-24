import { z } from "zod";
import { idSchema } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

const params = z.strictObject({ planId: idSchema });

export const GET = route({ auth: ["teacher", "principal"], params }, async ({ params, c, session }) => {
  return c.services.assessment.getSheet(params.planId, toActor(session));
});

/** 💾 Lưu hồ sơ minh chứng + chạy phân tích chuỗi tuần (body kiểm tra kỹ trong service: saveAssessmentInputSchema). */
export const POST = route({ auth: ["teacher"], params, body: z.unknown(), rateLimit: "ai" }, async ({ body, c, session }) => {
  return c.services.assessment.save(body, toActor(session));
});
