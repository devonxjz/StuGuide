import Link from "next/link";
import { ClipboardCheck, ListChecks } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { CardData } from "@/types/chat";

export function ChecklistCard({ data }: { data: Extract<CardData, { kind: "checklist" }> }) {
  return (
    <Card className="max-w-[44rem] animate-pop-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="size-5 text-primary" aria-hidden /> Checklist quan sát · {data.gameName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-1.5 text-sm">
          {data.criteria.map((c, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-bold text-primary-strong">{i + 1}</span>
              {c}
            </li>
          ))}
        </ol>
      </CardContent>
      <CardFooter>
        <Link href={`/teacher/assess/${data.planId}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft">
          <ClipboardCheck className="size-4" aria-hidden /> Mở bảng đánh giá cả lớp
        </Link>
      </CardFooter>
    </Card>
  );
}
