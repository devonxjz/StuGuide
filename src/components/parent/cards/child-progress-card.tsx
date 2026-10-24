import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CardData } from "@/types/chat";

const TONE = { Tốt: "success", "Đã đạt": "info", "Đang rèn thêm": "warning" } as const;

/** Mức đạt theo từng mảng phát triển của riêng bé, diễn đạt tích cực (không dán nhãn). */
export function ChildProgressCard({ data }: { data: Extract<CardData, { kind: "child-progress" }> }) {
  return (
    <Card className="max-w-[44rem] animate-pop-in">
      <CardHeader><CardTitle>Con đang tiến bộ thế nào?</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {data.progress.length === 0 && <p className="text-sm text-muted-foreground">Chưa có đánh giá nào để tổng hợp.</p>}
        {data.progress.map((p) => {
          const ok = Math.round(((p.excellent + p.achieved) / p.total) * 100);
          return (
            <div key={p.area}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{p.label}</span>
                <Badge tone={TONE[p.level]}>{p.level}</Badge>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${p.label}: ${ok}% hoạt động đã đạt hoặc tốt`}>
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(ok, 6)}%` }} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{p.total} lần ghi nhận gần đây</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
