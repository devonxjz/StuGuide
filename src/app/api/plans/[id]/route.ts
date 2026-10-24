import { z } from "zod";
import { idParams } from "@/core/schemas/common.schema";
import { EDITABLE_SECTIONS } from "@/core/schemas/lesson-plan.schema";
import { route, toActor } from "@/server/http";

/** Đọc giáo án: giáo viên chỉ lớp mình, BGH chỉ trường mình (kiểm tra trong getForActor). */
export const GET = route({ auth: ["teacher", "principal"], params: idParams }, async ({ params, c, session }) => {
  const actor = toActor(session);
  const plan = await c.services.lessonPlanner.getForActor(params.id, actor);
  const [versions, checklist, card] = await Promise.all([
    c.services.lessonPlanner.versions(params.id, actor),
    c.repos.assessments.findChecklistByPlan(params.id),
    c.repos.parentCards.findByPlan(params.id),
  ]);
  return { plan, versions, checklistId: checklist?.id ?? null, cardId: card?.id ?? null };
});

/** Giá trị từng phần được kiểm tra bằng sectionSchemas trong service (độ dài, số phần tử). */
const patchSchema = z.strictObject({ section: z.enum(EDITABLE_SECTIONS), value: z.unknown() });

/** Cô sửa tay một phần (Màn hình 4: ✏️ Sửa phần này) -> ghi PlanVersion. */
export const PATCH = route({ auth: ["teacher"], params: idParams, body: patchSchema }, async ({ body, params, c, session }) => {
  return { plan: await c.services.lessonPlanner.editSection(params.id, body.section, body.value, toActor(session)) };
});
