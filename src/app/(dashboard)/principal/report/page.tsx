import { notFound } from "next/navigation";
import { PrintButton } from "@/components/teacher/print-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/utils";
import { getContainer } from "@/server/container";
import { requireSession } from "@/server/session";
import { toActor } from "@/server/http";
import { isAppError } from "@/core/errors";

export const metadata = { title: "Báo cáo kiểm định" };

/** Bản xem trước báo cáo kiểm định: in hoặc lưu PDF bằng trình duyệt. Mỗi lần xuất được ghi vào nhật ký. */
export default async function ReportPage() {
  const session = await requireSession(["principal"]);
  const { services } = await getContainer();
  const report = await services.reports.exportReport(toActor(session)).catch((e) => {
    if (isAppError(e)) notFound();
    throw e;
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8 print:max-w-none print:p-0">
      <div className="no-print flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Xem trước · chọn “Lưu dưới dạng PDF” khi in</p>
        <PrintButton />
      </div>

      <article className="space-y-6 rounded-3xl border bg-card p-8 shadow-soft print:border-0 print:p-0 print:shadow-none">
        <header className="border-b pb-4">
          <h1 className="text-2xl font-bold text-balance">{report.title}</h1>
          <p className="text-sm text-muted-foreground">Lập lúc {formatDateTime(report.generatedAt)} · Tổng {report.totals.plans} giáo án, {report.totals.approved} đã duyệt</p>
        </header>

        <section>
          <h2 className="mb-3 text-lg font-bold">1. Chỉ số tổng quan</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><dt className="text-muted-foreground">Giáo án duyệt (30 ngày)</dt><dd className="text-2xl font-bold">{report.kpis.approvedLast30Days}</dd></div>
            <div><dt className="text-muted-foreground">Giáo án AI / GV (30 ngày)</dt><dd className="text-2xl font-bold">{report.kpis.plansPerTeacher}</dd></div>
            <div><dt className="text-muted-foreground">Đạt chuẩn pháp lý</dt><dd className="text-2xl font-bold">{report.kpis.legalComplianceRate}%</dd></div>
            <div><dt className="text-muted-foreground">Phụ huynh tương tác</dt><dd className="text-2xl font-bold">{report.kpis.parentEngagementRate}%</dd></div>
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">2. Độ bao phủ 5 mảng phát triển</h2>
          <table className="w-full text-sm">
            <tbody>{report.areaCoverage.map((a) => <tr key={a.area} className="border-t"><td className="py-2">{a.label}</td><td className="py-2 text-right tabular-nums">{a.count} giáo án</td></tr>)}</tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">3. Danh mục giáo án & căn cứ pháp lý</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Trò chơi</th><th>Lớp</th><th>Giáo viên</th><th>Căn cứ</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {report.plans.map((p) => (
                <tr key={p.id} className="border-t align-top">
                  <td className="py-2 pr-2 font-medium">{p.gameName}</td><td className="pr-2">{p.className}</td><td className="pr-2">{p.teacherName}</td>
                  <td className="pr-2">{p.documentCode} {p.legalVerified ? "✓" : "(chưa xác minh)"}</td><td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <footer className="border-t pt-3 text-xs text-muted-foreground">Báo cáo do hệ thống Mầm Học AI tạo tự động. Nội dung giáo án là bản nháp AI đã được giáo viên/BGH rà soát theo quy trình.</footer>
      </article>
    </div>
  );
}
