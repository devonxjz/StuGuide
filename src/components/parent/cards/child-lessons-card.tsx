import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { CardData } from "@/types/chat";

export function ChildLessonsCard({ data }: { data: Extract<CardData, { kind: "child-lessons" }> }) {
  return (
    <Card className="max-w-[44rem] animate-pop-in">
      <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="size-4 text-primary" aria-hidden /> Con đã học ở lớp</CardTitle></CardHeader>
      <CardContent className="space-y-2.5">
        {data.lessons.map((l) => (
          <div key={l.planId} className="rounded-xl bg-muted/60 p-3 text-sm">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-semibold">{l.gameName}</span>
              <Badge tone="info">{l.areaLabel}</Badge>
              <span className="text-xs text-muted-foreground">{formatDate(l.date)}</span>
            </div>
            <p className="text-muted-foreground">{l.summary}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
