import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanEditor } from "@/components/teacher/plan-editor";
import { isAppError } from "@/core/errors";
import { getContainer } from "@/server/container";
import { requireSession } from "@/server/session";
import { toActor } from "@/server/http";
import { idSchema } from "@/core/schemas/common.schema";
import type { PlanDTO } from "@/types/chat";

export const metadata: Metadata = { title: "Chi tiết giáo án" };

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["teacher", "principal"]);
  const { id } = await params;
  const { services, repos } = await getContainer();

  if (!idSchema.safeParse(id).success) notFound();
  const actor = toActor(session);

  // cùng một hàm phân quyền với API: giáo viên chỉ lớp mình, BGH chỉ trường mình
  const plan = await services.lessonPlanner.getForActor(id, actor).catch((e: unknown) => {
    if (isAppError(e)) return null;
    throw e;
  });
  if (!plan) notFound();

  const [versions, checklist] = await Promise.all([services.lessonPlanner.versions(id, actor), repos.assessments.findChecklistByPlan(id)]);
  return (
    <PlanEditor
      initialPlan={JSON.parse(JSON.stringify(plan)) as PlanDTO}
      versions={JSON.parse(JSON.stringify(versions))}
      role={session.role as "teacher" | "principal"}
      hasChecklist={Boolean(checklist)}
    />
  );
}
