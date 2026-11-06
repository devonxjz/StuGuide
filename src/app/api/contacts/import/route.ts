import { importContactsBodySchema } from "@/core/schemas/parent-email.schema";
import { route, toActor } from "@/server/http";

/** Cô nhập email phụ huynh theo tên bé (dán danh sách hoặc tải CSV); chỉ cập nhật phụ huynh đã liên kết với bé trong lớp mình. */
export const POST = route({ auth: ["teacher"], body: importContactsBodySchema }, async ({ body, c, session }) => {
  return c.services.parentEmails.importContacts(toActor(session), body.rows);
});
