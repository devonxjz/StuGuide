import { ParentCardsManager } from "@/components/teacher/parent-cards-manager";
import { getContainer } from "@/server/container";
import { requireSession } from "@/server/session";
import type { ParentCardContent } from "@/core/schemas/parent-card.schema";

export const metadata = { title: "Thẻ phụ huynh" };

export default async function ParentCardsPage() {
  const session = await requireSession(["teacher"]);
  const { services } = await getContainer();
  const classId = session.classId ?? "";
  const latest = await services.parentCards.latestForClass(classId);

  let candidatePlanId: string | null = null;
  if (!latest) {
    const plans = await services.lessonPlanner.listForClass(classId, 10);
    candidatePlanId = plans.find((p) => p.status === "approved")?.id ?? null;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-8">
      <header>
        <p className="text-sm font-semibold text-primary-strong">Vòng lặp kết nối gia đình</p>
        <h1 className="text-2xl font-bold tracking-tight">Thẻ nhiệm vụ & phản hồi của phụ huynh</h1>
      </header>
      <ParentCardsManager
        card={latest ? { id: latest.card.id, status: latest.card.status, content: latest.card.content as unknown as ParentCardContent, gameName: latest.card.lessonPlan.gameName } : null}
        stats={latest?.stats ?? null}
        links={latest?.links.map((l) => ({ studentName: l.studentName, url: l.url })) ?? []}
        candidatePlanId={candidatePlanId}
      />
    </div>
  );
}
