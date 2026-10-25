import { AppShell } from "@/components/shared/app-shell";
import { requireSession } from "@/server/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["teacher", "principal"]);
  const subtitle = session.role === "teacher" ? `${session.className ?? "Lớp học"} · ${session.ageLabel ?? ""}` : `${session.schoolName} · Ban giám hiệu`;
  return (
    <AppShell role={session.role} userName={session.fullName} subtitle={subtitle}>
      {children}
    </AppShell>
  );
}
