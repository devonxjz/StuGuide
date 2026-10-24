"use client";

import Link from "next/link";
import { Eye, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { useLiveFeedback } from "@/hooks/use-live-feedback";
import { ConversationList, type ConversationItem } from "./conversation-list";
import { MemoryPanel, type MemoryItem } from "./memory-panel";
import { formatDate } from "@/lib/utils";
import type { FeedbackStats } from "@/services/types";
import type { AlertDTO, PlanSummaryDTO } from "@/types/chat";

const EMPTY: FeedbackStats = { total: 0, completed: 0, needsPractice: 0, pending: 0, completionRate: 0, completedStudents: [], needsSupportStudents: [], pendingStudents: [] };

function FeedbackWidget({ cardId, initial }: { cardId: string; initial: FeedbackStats }) {
  const { stats, live } = useLiveFeedback(cardId, initial);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Phụ huynh phản hồi</CardTitle>
        <Badge tone={live ? "success" : "neutral"}><Radio aria-hidden /> {live ? "Trực tiếp" : "Hôm qua"}</Badge>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <ProgressRing value={stats.completionRate} size={92} />
        <p className="text-sm text-muted-foreground">
          <b className="text-foreground">{stats.completed}/{stats.total}</b> phụ huynh đã cùng con hoàn thành nhiệm vụ 5 phút.
          {stats.needsPractice > 0 && <> {stats.needsPractice} bé cần hỗ trợ thêm.</>}
        </p>
      </CardContent>
    </Card>
  );
}

/** Cột "Hôm nay" bên cạnh chat: thông báo nhanh, gợi ý quan sát sâu, giáo án gần đây. */
export function TeacherRail({
  cardId,
  stats,
  alerts,
  plans,
  conversations,
  activeConversationId,
  memories,
}: {
  cardId: string | null;
  stats: FeedbackStats | null;
  alerts: AlertDTO[];
  plans: PlanSummaryDTO[];
  conversations: ConversationItem[];
  activeConversationId?: string;
  memories: MemoryItem[];
}) {
  return (
    <aside aria-label="Thông báo nhanh" className="scroll-thin hidden w-80 shrink-0 space-y-4 overflow-y-auto border-l bg-card/40 p-4 lg:block">
      <ConversationList items={conversations} activeId={activeConversationId} />
      <MemoryPanel items={memories} />

      {cardId ? <FeedbackWidget cardId={cardId} initial={stats ?? EMPTY} /> : null}

      {alerts.map((a) => (
        <Card key={a.id} className="border-sun/50 bg-sun-soft/60">
          <CardContent className="flex gap-3 p-4">
            <Eye className="mt-0.5 size-5 shrink-0 text-sun-strong" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold">Gợi ý quan sát sâu · {a.studentName}</p>
              <p className="mt-0.5 text-muted-foreground">{a.pattern}</p>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle>Bài học gần đây</CardTitle></CardHeader>
        <CardContent className="space-y-1 p-3 pt-0">
          {plans.map((p) => (
            <Link key={p.id} href={`/teacher/plan/${p.id}`} className="block rounded-xl px-2.5 py-2 hover:bg-muted">
              <span className="block truncate text-sm font-semibold">{p.gameName}</span>
              <span className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                {formatDate(p.createdAt)} <StatusBadge status={p.status} />
              </span>
            </Link>
          ))}
          {plans.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">Chưa có bài học nào.</p>}
        </CardContent>
      </Card>
    </aside>
  );
}
