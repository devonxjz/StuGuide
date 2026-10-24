import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import type { CardData } from "@/types/chat";

export function PlanListCard({ data }: { data: Extract<CardData, { kind: "plan-list" }> }) {
  return (
    <Card className="max-w-[44rem] animate-pop-in">
      <CardContent className="divide-y p-2">
        {data.plans.map((p) => (
          <Link key={p.id} href={`/teacher/plan/${p.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-muted">
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{p.gameName}</span>
              <span className="text-xs text-muted-foreground">
                {p.topic} · {formatDate(p.createdAt)}
              </span>
            </span>
            <StatusBadge status={p.status} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
