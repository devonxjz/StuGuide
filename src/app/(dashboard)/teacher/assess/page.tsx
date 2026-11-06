import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { getContainer } from "@/server/container";
import { toActor } from "@/server/http";
import { requireSession } from "@/server/session";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Quan sát 30 giây" };

/** Chọn giáo án để xem hoặc ghi nhận quan sát: mỗi giáo án giữ nhận xét chung và nhận xét từng bé đã lưu. */
export default async function AssessIndex() {
  const session = await requireSession(["teacher"]);
  const { services } = await getContainer();
  const items = await services.assessment.listPlansForObservation(toActor(session));

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 md:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Quan sát 30 giây</h1>
        <p className="mt-1 text-sm text-slate-500">Chọn một giáo án để xem hoặc ghi nhận nhận xét về buổi chơi và từng bé đã tham gia.</p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 p-8 text-center">
          <p className="font-medium">Lớp chưa có giáo án nào</p>
          <p className="mt-1 text-sm text-slate-500">Cô soạn một giáo án với trợ lý AI trước, rồi quay lại đây để ghi nhận quan sát.</p>
          <Link href="/teacher" className="mt-4 inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground">Về trợ lý AI</Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
          {items.map(({ plan, savedAt }) => (
            <li key={plan.id}>
              <Link href={`/teacher/assess/${plan.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50">
                <ClipboardCheck className="size-4 shrink-0 text-slate-400" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{plan.gameName ?? plan.topic}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {formatDate(plan.createdAt)} · {savedAt ? `Đã lưu nhận xét lúc ${formatDateTime(savedAt)}` : plan.status === "approved" || plan.status === "shared" ? "Chưa ghi nhận quan sát" : "Cần duyệt giáo án trước"}
                  </span>
                </span>
                <StatusBadge status={plan.status} />
                <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
