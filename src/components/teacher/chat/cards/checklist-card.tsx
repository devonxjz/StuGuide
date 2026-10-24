import Link from "next/link";
import { ClipboardCheck, ListChecks } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { CardData } from "@/types/chat";

export function ChecklistCard({ data }: { data: Extract<CardData, { kind: "checklist" }> }) {
  return (
    <Card className="max-w-[44rem] animate-pop-in border-border/80 bg-card shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 text-base font-bold">
          <span className="grid size-7.5 place-items-center rounded-lg bg-sun-soft text-sun-strong">
            <ListChecks className="size-4" aria-hidden />
          </span>
          Checklist quan sát · {data.gameName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2 text-sm">
          {data.criteria.map((c, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="grid size-5.5 shrink-0 place-items-center rounded-full bg-sun-soft text-[11px] font-bold text-sun-strong border border-sun/20">
                {i + 1}
              </span>
              <span className="text-foreground leading-snug pt-0.5">{c}</span>
            </li>
          ))}
        </ol>
      </CardContent>
      <CardFooter className="border-t border-border/70 bg-muted/20">
        <Link
          href={`/teacher/assess/${data.planId}`}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-sun px-4.5 text-sm font-bold text-white shadow-soft transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <ClipboardCheck className="size-4" aria-hidden /> Mở bảng đánh giá cả lớp (30s)
        </Link>
      </CardFooter>
    </Card>
  );
}
