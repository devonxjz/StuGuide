import { feedbackInputSchema } from "@/core/schemas/feedback.schema";
import { route } from "@/server/http";

/** Phụ huynh bấm 1 chạm (xác thực bằng token riêng trong body, không cần đăng nhập). */
export const POST = route({ auth: "public", body: feedbackInputSchema, rateLimit: "public-token" }, async ({ body, c }) => {
  const { stats, feedback } = await c.services.feedback.submit(body);
  return { stats, response: feedback.response };
});
