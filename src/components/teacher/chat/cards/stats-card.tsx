"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useLiveFeedback } from "@/hooks/use-live-feedback";
import type { CardData } from "@/types/chat";

/** Tỷ lệ hoàn thành tự nhảy số khi phụ huynh bấm 1 chạm (SSE). */
export function StatsCard({ data }: { data: Extract<CardData, { kind: "feedback-stats" }> }) {
  const { stats, live } = useLiveFeedback(data.cardId, data.stats);
  return (
    <Card className="max-w-[44rem] animate-pop-in">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Phản hồi của phụ huynh</CardTitle>
        <Badge tone={live ? "success" : "neutral"}>
          <Radio aria-hidden /> {live ? "Cập nhật trực tiếp" : "Đã tải"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-6">
        <ProgressRing value={stats.completionRate} label="hoàn thành" />
        <dl className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm">
          <div>
            <dt className="text-muted-foreground">Hoàn thành</dt>
            <dd className="text-xl font-bold text-primary-strong tabular-nums">{stats.completed}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cần hỗ trợ</dt>
            <dd className="text-xl font-bold text-sun-strong tabular-nums">{stats.needsPractice}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Chưa phản hồi</dt>
            <dd className="text-xl font-bold tabular-nums">{stats.pending}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter>
        <Link href="/teacher/parent-cards" className="text-sm font-semibold text-primary-strong hover:underline">
          Xem danh sách theo từng bé →
        </Link>
      </CardFooter>
    </Card>
  );
}
