import { Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardData } from "@/types/chat";

export function NoticeCard({ data }: { data: Extract<CardData, { kind: "notice" }> }) {
  const warning = data.tone === "warning";
  return (
    <div role="status" className={cn("flex max-w-[44rem] gap-2.5 rounded-2xl border p-3.5 text-sm", warning ? "border-sun/50 bg-sun-soft text-sun-strong" : "border-sky/40 bg-sky-soft text-sky-strong")}>
      {warning ? <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <Info className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <p className="font-medium">{data.message}</p>
    </div>
  );
}
