import { BadgeCheck, CircleCheck, Clock, HeartHandshake, Sparkles } from "lucide-react";
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
      icon: CircleCheck,
      tone: "bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-[0_6px_14px_rgba(16,185,129,0.28)]",
    },
    {
      label: "Giáo án AI / giáo viên",
      value: String(kpis.plansPerTeacher),
      hint:
        kpis.medianApprovalHours === null
          ? "Chưa có bài được duyệt trong 30 ngày"
          : `Trung vị ${kpis.medianApprovalHours} giờ từ lúc soạn tới lúc duyệt`,
      icon: Clock,
      tone: "bg-gradient-to-tr from-sky-400 to-blue-600 text-white shadow-[0_6px_14px_rgba(2,132,199,0.28)]",
    },
    {
      label: "Đạt chuẩn pháp lý TT 45",
      value: `${kpis.legalComplianceRate}%`,
      hint: "Căn cứ đã đối chiếu kho tri thức",
      icon: BadgeCheck,
      tone: "bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-[0_6px_14px_rgba(99,102,241,0.28)]",
    },
    {
      label: "Phụ huynh tương tác",
      value: `${kpis.parentEngagementRate}%`,
      hint: "Toàn trường hưởng ứng nhiệm vụ 5 phút",
      icon: HeartHandshake,
      tone: "bg-gradient-to-tr from-amber-400 to-rose-400 text-white shadow-[0_6px_14px_rgba(245,158,11,0.28)]",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, hint, icon: Icon, tone }) => (
        <Card
          key={label}
          className="border-slate-200/90 bg-white shadow-soft hover:shadow-float hover:-translate-y-1 transition-all duration-300 rounded-3xl"
        >
          <CardContent className="flex items-start gap-4 p-5">
            <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
              <Icon className="size-5.5" aria-hidden />
            </span>
            <div>
              <p className="text-3xl leading-none font-black text-slate-900 tabular-nums">{value}</p>
              <p className="mt-2 text-sm font-bold text-slate-700">{label}</p>
              {hint && <p className="mt-1 text-xs text-slate-500 font-medium">{hint}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
