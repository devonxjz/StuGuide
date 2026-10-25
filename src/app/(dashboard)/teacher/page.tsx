import type { Metadata } from "next";
import { ChatWorkspace } from "@/components/teacher/chat/chat-workspace";
import { TeacherRail } from "@/components/teacher/teacher-rail";
import { isAppError } from "@/core/errors";
import { getContainer } from "@/server/container";
import { requireSession } from "@/server/session";
import { toActor } from "@/server/http";
import type { StuGuideMessage } from "@/types/chat";

export const metadata: Metadata = { title: "Trợ lý chat" };

export default async function TeacherHome({ searchParams }: { searchParams: Promise<{ c?: string; n?: string }> }) {
  const session = await requireSession(["teacher"]);
  const { c, n } = await searchParams;
  const { services, conversations } = await getContainer();
  const actor = toActor(session);
  const classId = session.classId ?? "";

  // Mở lại cuộc trò chuyện đã lưu (kiểm tra quyền sở hữu); id lạ coi như chat mới
  const saved = c
    ? await conversations.load(actor, c).catch((e: unknown) => {
        if (isAppError(e)) return null;
        throw e;
      })
    : null;

  const [plans, alerts, latest, list, memories] = await Promise.all([
    services.lessonPlanner.listForClass(classId, 5),
    services.assessment.listAlerts(classId),
    services.parentCards.latestForClass(classId),
    conversations.list(actor),
    conversations.memories(actor),
  ]);

  return (
    <div className="flex">
      <div className="min-w-0 flex-1">
        <ChatWorkspace
          key={saved?.conversation.id ?? `new-${n ?? ""}`}
          teacherName={session.fullName}
          className={session.className ?? "lớp mình"}
          conversationId={saved?.conversation.id}
          initialMessages={(saved?.messages ?? []).map((m) => ({ id: m.id, role: m.role, parts: m.parts })) as StuGuideMessage[]}
        />
      </div>
      <TeacherRail
        cardId={latest?.card.id ?? null}
        stats={latest?.stats ?? null}
        alerts={alerts.map((a) => ({ id: a.id, studentId: a.studentId, studentName: a.student.fullName, pattern: a.pattern, weekCount: a.weekCount, skillArea: a.skillArea, suggestedActivity: a.suggestedActivity, disclaimer: a.disclaimer }))}
        plans={plans.map((p) => ({ id: p.id, gameName: p.gameName, status: p.status, topic: p.topic, createdAt: p.createdAt.toISOString() }))}
        conversations={list.map((x) => ({ id: x.id, title: x.title, updatedAt: x.updatedAt.toISOString() }))}
        activeConversationId={saved?.conversation.id}
        memories={memories.map((m) => ({ id: m.id, content: m.content }))}
      />
    </div>
  );
}
