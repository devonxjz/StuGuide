import { emptyBody, idParams } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

/** ✅ Phê duyệt (chỉ qua nút bấm của người thật); giáo viên duyệt xong sẽ tự tạo checklist quan sát. */
export const POST = route({ auth: ["teacher", "principal"], params: idParams, body: emptyBody, rateLimit: "ai" }, async ({ params, c, session }) => {
  const actor = toActor(session);
  const plan = await c.services.lessonPlanner.approve(params.id, actor);
  const checklist = session.role === "teacher" ? await c.services.assessment.createChecklist(params.id, actor) : null;
  return { plan, checklistId: checklist?.checklist.id ?? null, criteria: checklist?.criteria ?? [] };
});
