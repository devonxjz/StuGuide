import { BadgeCheck, CircleCheck, Clock, HeartHandshake } from "lucide-react";
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
    { label: "Giáo án đã duyệt (30 ngày)", value: String(kpis.approvedLast30Days), icon: CircleCheck, tone: "bg-primary-soft text-primary-strong" },
    {
      label: "Giáo án AI / giáo viên (30 ngày)",
      value: String(kpis.plansPerTeacher),
      hint: kpis.medianApprovalHours === null ? "Chưa có bài được duyệt trong 30 ngày" : `Trung vị ${kpis.medianApprovalHours} giờ từ lúc soạn tới lúc duyệt`,
      icon: Clock,
      tone: "bg-sky-soft text-sky-strong",
    },
    { label: "Bài đạt chuẩn pháp lý", value: `${kpis.legalComplianceRate}%`, hint: "Căn cứ đã đối chiếu kho tri thức", icon: BadgeCheck, tone: "bg-lilac-soft text-lilac-strong" },
    { label: "Phụ huynh tương tác", value: `${kpis.parentEngagementRate}%`, hint: "Toàn trường", icon: HeartHandshake, tone: "bg-sun-soft text-sun-strong" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, hint, icon: Icon, tone }) => (
        <Card key={label}>
          <CardContent className="flex items-start gap-4 p-5">
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tone}`}><Icon className="size-5" aria-hidden /></span>
            <div>
              <p className="text-3xl leading-none font-bold tabular-nums">{value}</p>
              <p className="mt-1.5 text-sm font-medium">{label}</p>
              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
