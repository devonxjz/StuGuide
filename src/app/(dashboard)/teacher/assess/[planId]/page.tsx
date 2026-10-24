import Link from "next/link";
import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { ChecklistTable } from "@/components/teacher/checklist-table";
import { hasErrorCode, isAppError } from "@/core/errors";
import { idSchema } from "@/core/schemas/common.schema";
import { getContainer } from "@/server/container";
import { requireSession } from "@/server/session";
import { toActor } from "@/server/http";

export const metadata = { title: "Ghi nhận quan sát" };

export default async function AssessPage({ params }: { params: Promise<{ planId: string }> }) {
  const session = await requireSession(["teacher"]);
  const { planId } = await params;
  if (!idSchema.safeParse(planId).success) notFound();
  const { services } = await getContainer();
  const actor = toActor(session);

  const result = await (async () => {
    await services.assessment.createChecklist(planId, actor); // idempotent
    return services.assessment.getSheet(planId, actor);
  })().then(
    (sheet) => ({ sheet, error: null }),
    (error: unknown) => {
      if (isAppError(error)) return { sheet: null, error };
      throw error;
    },
  );

  if (result.error) {
    if (!hasErrorCode(result.error, "ERR-FLOW-01")) notFound();
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <TriangleAlert className="mx-auto mb-3 size-10 text-sun-strong" aria-hidden />
        <h1 className="text-xl font-bold">Cần phê duyệt giáo án trước</h1>
        <p className="mt-2 text-muted-foreground">{result.error.message}</p>
        <Link href={`/teacher/plan/${planId}`} className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Mở giáo án để phê duyệt</Link>
      </div>
    );
  }

  const sheet = result.sheet!;
  const initial = Object.fromEntries(
    sheet.assessments.map((a) => [a.studentId, { overall: a.overallRating, ratings: a.ratings, note: a.note ?? "" }]),
  ) as React.ComponentProps<typeof ChecklistTable>["initial"];

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 md:px-8">
      <header>
        <p className="text-sm font-semibold text-primary-strong">Ghi nhận quan sát cuối ngày · 30 giây</p>
        <h1 className="text-2xl font-bold tracking-tight text-balance">{sheet.plan.gameName}</h1>
      </header>
      <ChecklistTable
        planId={planId}
        checklistId={sheet.checklist.id}
        criteria={sheet.criteria}
        students={sheet.students.map((s) => ({ id: s.id, fullName: s.fullName, avatarEmoji: s.avatarEmoji }))}
        initial={initial}
        alerts={sheet.alerts.map((a) => ({ id: a.id, studentId: a.studentId, studentName: a.student.fullName, pattern: a.pattern, weekCount: a.weekCount, skillArea: a.skillArea, suggestedActivity: a.suggestedActivity, disclaimer: a.disclaimer }))}
      />
    </div>
  );
}
