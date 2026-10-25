import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChildProgressCard } from "@/components/parent/cards/child-progress-card";
import { ChildMemoryPanel } from "@/components/parent/child-memory-panel";
import { FamilyAssistant } from "@/components/parent/family-assistant";
import { ShortTermProvider } from "@/components/parent/short-term-context";
import { hasErrorCode } from "@/core/errors";
import { idSchema } from "@/core/schemas/common.schema";
import { formatDate } from "@/lib/utils";
import { getContainer } from "@/server/container";
import { requireSession } from "@/server/session";
import { toActor } from "@/server/http";

export const metadata = { title: "Con đang học gì" };

export default async function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["parent"]);
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const { family, repos } = await getContainer();

  // BR-006: truy cập con người khác bị từ chối và ghi AuditLog (trong service)
  const overview = await family.profiles.overview(toActor(session), id).catch((e: unknown) => {
    if (hasErrorCode(e, "ERR-AUTH-01")) return null;
    throw e;
  });
  if (!overview) notFound();
  const { student } = overview;
  const latest = overview.recentLessons[0];
  const link = latest ? await repos.parentCards.tokenFor({ parentId: session.id, studentId: student.id, lessonPlanId: latest.planId }) : null;

  return (
    <ShortTermProvider studentId={student.id}>
      <div className="space-y-5">
        <header className="flex items-center gap-4">
          <span className="grid size-20 place-items-center rounded-3xl bg-sun-soft text-5xl shadow-soft" aria-hidden>{student.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{student.fullName}</h1>
            <p className="text-muted-foreground">{student.className} · {student.ageLabel} · Cô {student.teacherName.replace(/^Cô\s+/, "")}</p>
          </div>
        </header>

        {latest && (
          <Card className="border-primary/30 bg-primary-soft/40">
            <CardHeader className="gap-1.5">
              <Badge tone="success" className="w-fit"><BookOpen aria-hidden /> Hôm nay ở lớp con làm gì?</Badge>
              <CardTitle className="text-lg">{latest.gameName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[15px]">
              <p className="leading-relaxed">{latest.summary}</p>
              {latest.missionTitle && <p className="text-sm text-muted-foreground">Nhiệm vụ {latest.missionTitle.toLowerCase()}</p>}
              {link && (
                <Link href={`/parent/${link.token}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft">
                  <Smartphone className="size-4" aria-hidden /> Mở thẻ nhiệm vụ 5 phút & phản hồi cô <ArrowRight className="size-4" aria-hidden />
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-5">
            <FamilyAssistant studentId={student.id} childName={student.fullName.split(" ").slice(-1)[0]} />
            <ChildProgressCard data={{ kind: "child-progress", progress: overview.progress }} />
          </div>
          <div className="space-y-5">
            <ChildMemoryPanel studentId={student.id} childName={student.fullName.split(" ").slice(-1)[0]} items={overview.memories} sharedWithTeacher={overview.sharedWithTeacher} />
            <Card>
              <CardHeader><CardTitle>Bài học gần đây</CardTitle></CardHeader>
              <CardContent className="space-y-2.5 p-4 pt-0">
                {overview.recentLessons.map((l) => (
                  <div key={l.planId} className="rounded-xl bg-muted/60 p-3 text-sm">
                    <p className="font-semibold">{l.gameName}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge tone="info">{l.areaLabel}</Badge>{formatDate(l.date)}{l.myResponse === "completed" && <Badge tone="success">Bé đã hoàn thành</Badge>}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ShortTermProvider>
  );
}
