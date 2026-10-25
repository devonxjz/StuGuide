import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { ApprovalQueue } from "@/components/principal/approval-queue";
import { AuditLogTable } from "@/components/principal/audit-log-table";
import { DevelopmentChart } from "@/components/principal/development-chart";
import { KpiCards } from "@/components/principal/kpi-cards";
import { getContainer } from "@/server/container";
import { requireSession } from "@/server/session";
import { toActor } from "@/server/http";

export const metadata = { title: "Tổng quan trường" };

export default async function PrincipalPage() {
  const session = await requireSession(["principal"]);
  const { services } = await getContainer();
  const d = await services.reports.dashboard(toActor(session));

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary-strong">{session.schoolName}</p>
          <h1 className="text-2xl font-bold tracking-tight">Bảng điều khiển Ban giám hiệu</h1>
        </div>
        <Link href="/principal/report" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-soft">
          <FileBarChart className="size-5" aria-hidden /> Xuất Báo cáo Kiểm định Chất lượng Giáo dục
        </Link>
      </header>

      <KpiCards kpis={d.kpis} />

      <div className="grid gap-5 xl:grid-cols-2">
        <DevelopmentChart data={d.areaCoverage} />
        <ApprovalQueue items={d.approvalQueue.map((p) => ({ id: p.id, gameName: p.gameName, className: p.className, teacherName: p.teacherName }))} />
      </div>

      <AuditLogTable rows={d.auditLog} />
    </div>
  );
}
