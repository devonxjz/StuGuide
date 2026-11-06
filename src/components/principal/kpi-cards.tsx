import { Card, CardContent } from "@/components/ui/card";

interface Kpis {
  approvedLast30Days: number;
  plansPerTeacher: number;
  medianApprovalHours: number | null;
  legalComplianceRate: number;
  parentEngagementRate: number;
}

export function KpiCards({ kpis }: { kpis: Kpis }) {
  const items = [
    {
      label: "Giáo án đã duyệt (30 ngày)",
      value: String(kpis.approvedLast30Days),
    },
    {
      label: "Giáo án AI / giáo viên",
      value: String(kpis.plansPerTeacher),
      hint:
        kpis.medianApprovalHours === null
          ? "Chưa có bài được duyệt trong 30 ngày"
          : `Trung vị ${kpis.medianApprovalHours} giờ từ lúc soạn tới lúc duyệt`,
    },
    {
      label: "Đạt chuẩn pháp lý TT 45",
      value: `${kpis.legalComplianceRate}%`,
      hint: "Căn cứ đã đối chiếu kho tri thức",
    },
    {
      label: "Phụ huynh tương tác",
      value: `${kpis.parentEngagementRate}%`,
      hint: "Toàn trường hưởng ứng nhiệm vụ 5 phút",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, hint }) => (
        <Card key={label}>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl leading-none font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
            {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
