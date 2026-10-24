import { z } from "zod";
import { parentTokenSchema } from "@/core/schemas/common.schema";
import { route } from "@/server/http";

/** Công khai nhưng chỉ trả dữ liệu của đúng bé được liên kết với token (BR-006). */
export const GET = route({ auth: "public", params: z.strictObject({ token: parentTokenSchema }), rateLimit: "public-token" }, async ({ params, c }) => {
  return c.services.feedback.view(params.token);
});
