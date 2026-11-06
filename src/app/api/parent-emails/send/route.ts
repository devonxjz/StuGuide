import { sendEmailsBodySchema } from "@/core/schemas/parent-email.schema";
import { route, toActor } from "@/server/http";

/** Gửi email cho phụ huynh: chỉ chạy khi cô bấm nút trên thẻ (agent không tự gửi). Địa chỉ nhận do server tra lại từ danh bạ lớp. */
export const POST = route({ auth: ["teacher"], body: sendEmailsBodySchema, rateLimit: "email" }, async ({ body, c, session }) => {
  return c.services.parentEmails.send(toActor(session), body);
});
