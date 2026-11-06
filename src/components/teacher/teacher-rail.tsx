"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MemoryPanel, type MemoryItem } from "./memory-panel";
import { RecentLessons } from "./recent-lessons";
import type { AlertDTO, PlanSummaryDTO } from "@/types/chat";

/** Cột bên cạnh chat: trí nhớ về lớp, gợi ý quan sát sâu và bài học gần đây. Lịch sử chat nằm ở sidebar trái. */
export function TeacherRail({ alerts, plans, memories }: { alerts: AlertDTO[]; plans: PlanSummaryDTO[]; memories: MemoryItem[] }) {
  return (
    <aside
      aria-label="Thông báo nhanh"
      className="scroll-thin hidden w-80 shrink-0 space-y-4 overflow-y-auto border-l border-slate-200/80 bg-slate-50/50 p-4 lg:block"
    >
      <MemoryPanel items={memories} />

      {alerts.map((a) => (
        <Card key={a.id} className="border-amber-200 bg-white shadow-none">
          <CardContent className="p-4 text-xs">
            <p className="font-semibold text-slate-900">Quan sát sâu · {a.studentName}</p>
            <p className="mt-1 leading-relaxed text-slate-600">{a.pattern}</p>
          </CardContent>
        </Card>
      ))}

      <RecentLessons items={plans} />
    </aside>
  );
}
