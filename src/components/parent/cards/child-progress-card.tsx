import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CardData } from "@/types/chat";

const TONE = { Tốt: "success", "Đã đạt": "info", "Đang rèn thêm": "warning" } as const;

/** Mức đạt theo từng mảng phát triển của riêng bé, diễn đạt tích cực (không dán nhãn). */
export function ChildProgressCard({ data }: { data: Extract<CardData, { kind: "child-progress" }> }) {
  return (
    <Card className="max-w-[44rem] animate-pop-in bg-white border-slate-200/90 shadow-soft">
      <CardHeader>
        <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <span>🌟</span> Con đang tiến bộ thế nào?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {data.progress.length === 0 && <p className="text-sm text-muted-foreground">Chưa có đánh giá nào để tổng hợp.</p>}
        {data.progress.map((p) => {
          const ok = Math.round(((p.excellent + p.achieved) / p.total) * 100);
          return (
            <div key={p.area} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-bold text-slate-800">{p.label}</span>
                <Badge tone={TONE[p.level]} className="font-bold">{p.level}</Badge>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${p.label}: ${ok}% hoạt động đã đạt hoặc tốt`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-blue-500 to-cyan-400 transition-all duration-500 shadow-2xs"
                  style={{ width: `${Math.max(ok, 8)}%` }}
                />
              </div>
              <p className="text-[11px] font-medium text-slate-500">{p.total} lần ghi nhận gần đây</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
