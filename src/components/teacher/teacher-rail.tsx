"use client";

import Link from "next/link";
import { Eye, HeartHandshake, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { useLiveFeedback } from "@/hooks/use-live-feedback";
import { ConversationList, type ConversationItem } from "./conversation-list";
import { MemoryPanel, type MemoryItem } from "./memory-panel";
import { cn, formatDate } from "@/lib/utils";
import type { FeedbackStats } from "@/services/types";
import type { AlertDTO, PlanSummaryDTO } from "@/types/chat";

const EMPTY: FeedbackStats = {
  total: 0,
  completed: 0,
  needsPractice: 0,
  pending: 0,
  completionRate: 0,
  completedStudents: [],
  needsSupportStudents: [],
  pendingStudents: [],
};

function FeedbackWidget({ cardId, initial }: { cardId: string; initial: FeedbackStats }) {
  const { stats, live } = useLiveFeedback(cardId, initial);
  return (
    <Card className="border-rose-100 bg-white shadow-2xs">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
          <HeartHandshake className="size-4 text-rose-500" /> Phụ huynh phản hồi
        </CardTitle>
        <Badge tone={live ? "success" : "neutral"} className="gap-1.5 font-bold">
          <span className={cn("size-2 rounded-full", live ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
          {live ? "Trực tiếp" : "Hôm qua"}
        </Badge>
      </CardHeader>
      <CardContent className="flex items-center gap-4 pt-2">
        <ProgressRing value={stats.completionRate} size={84} />
        <p className="text-xs text-slate-600 leading-relaxed">
          <b className="text-slate-900 text-sm font-bold">{stats.completed}/{stats.total}</b> phụ huynh đã hoàn thành nhiệm vụ 5 phút cùng bé.
          {stats.needsPractice > 0 && (
            <span className="block mt-1 font-bold text-amber-700">
              ⚠️ {stats.needsPractice} bé cần hỗ trợ thêm.
            </span>
          )}
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
    <aside
      aria-label="Thông báo nhanh"
      className="scroll-thin hidden w-80 shrink-0 space-y-4 overflow-y-auto border-l border-slate-200/80 bg-slate-50/50 p-4 lg:block"
    >
      <ConversationList items={conversations} activeId={activeConversationId} />
      <MemoryPanel items={memories} />

      {cardId ? <FeedbackWidget cardId={cardId} initial={stats ?? EMPTY} /> : null}

      {alerts.map((a) => (
        <Card key={a.id} className="border-amber-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="flex gap-3 p-4">
            <span className="grid size-8.5 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white shadow-2xs">
              <Eye className="size-4" aria-hidden />
            </span>
            <div className="text-xs">
              <p className="font-bold text-slate-900 flex items-center gap-1">
                <span>🔍</span> Gợi ý quan sát sâu · {a.studentName}
              </p>
              <p className="mt-1 text-slate-600 leading-relaxed">{a.pattern}</p>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="border-slate-200/90 bg-white shadow-2xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
            <span>📚</span> Bài học gần đây
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-3 pt-0">
          {plans.map((p) => (
            <Link
              key={p.id}
              href={`/teacher/plan/${p.id}`}
              className="block rounded-xl px-2.5 py-2 hover:bg-blue-50/60 transition-colors group"
            >
              <span className="block truncate text-xs font-bold text-slate-800 group-hover:text-primary transition-colors">
                {p.gameName}
              </span>
              <span className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                {formatDate(p.createdAt)} <StatusBadge status={p.status} />
              </span>
            </Link>
          ))}
          {plans.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">Chưa có bài học nào.</p>}
        </CardContent>
      </Card>
    </aside>
  );
}
