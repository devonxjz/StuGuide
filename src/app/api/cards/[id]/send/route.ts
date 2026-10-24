import { emptyBody, idParams } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

/** ✅ Duyệt & Gửi: chỉ chạy khi cô bấm nút trên thẻ (agent không tự gửi). Sinh link riêng cho từng phụ huynh. */
export const POST = route({ auth: ["teacher"], params: idParams, body: emptyBody }, async ({ params, c, session }) => {
  const actor = toActor(session);
  const { links } = await c.services.parentCards.send(params.id, actor);
  return { links, stats: await c.services.parentCards.statsForActor(params.id, actor) };
});
