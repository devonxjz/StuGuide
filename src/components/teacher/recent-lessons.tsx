"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import type { PlanSummaryDTO } from "@/types/chat";

/** Giáo án gần đây của lớp (cột phải cạnh chat); bấm để mở, sửa, in hoặc duyệt. */
export function RecentLessons({ items }: { items: PlanSummaryDTO[] }) {
  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900">Bài học gần đây</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-3 pt-0">
        {items.map((p) => (
          <Link key={p.id} href={`/teacher/plan/${p.id}`} className="block rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-50">
            <span className="block truncate text-xs font-medium text-slate-800">{p.gameName}</span>
            <span className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
              {formatDate(p.createdAt)} <StatusBadge status={p.status} />
            </span>
          </Link>
        ))}
        {items.length === 0 && <p className="px-2 py-3 text-xs text-slate-500">Chưa có bài học nào.</p>}
      </CardContent>
    </Card>
  );
}
