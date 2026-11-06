import { AppShell } from "@/components/shared/app-shell";
import { getContainer } from "@/server/container";
import { toActor } from "@/server/http";
import { requireSession } from "@/server/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["teacher", "principal"]);
  const subtitle = session.role === "teacher" ? `${session.className ?? "Lớp học"} · ${session.ageLabel ?? ""}` : `${session.schoolName} · Ban giám hiệu`;
  // Lịch sử trò chuyện nằm ở sidebar trái nên layout nạp luôn (chỉ giáo viên có chat)
  const { conversations: conversationService } = await getContainer();
  const conversations =
    session.role === "teacher"
      ? (await conversationService.list(toActor(session))).map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt.toISOString() }))
      : [];
  return (
    <AppShell role={session.role} userName={session.fullName} subtitle={subtitle} conversations={conversations} classes={session.classes} currentClassId={session.classId}>
      {children}
    </AppShell>
  );
}
