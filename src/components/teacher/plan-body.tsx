import { BookOpen, Package, Play, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanDTO } from "@/types/chat";

const PHASE = { warmup: { label: "Khởi động", tone: "bg-sun-soft text-sun-strong" }, main: { label: "Chính", tone: "bg-primary-soft text-primary-strong" }, cooldown: { label: "Kết thúc", tone: "bg-sky-soft text-sky-strong" } } as const;

/** Giáo án 3 phần (mục tiêu – chuẩn bị – cách chơi) + lời dẫn mẫu. Chỉ đọc. */
export function PlanBody({ plan, procedureOnly = false }: { plan: PlanDTO; procedureOnly?: boolean }) {
  return (
    <div className="space-y-4 text-sm">
      {!procedureOnly && (
      <>
      <section>
        <h4 className="mb-1.5 flex items-center gap-2 font-bold"><BookOpen className="size-4 text-primary" aria-hidden /> Phần 1 · Mục tiêu</h4>
        <ul className="list-inside list-disc space-y-1 leading-relaxed">{plan.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
      </section>
      <section>
        <h4 className="mb-1.5 flex items-center gap-2 font-bold"><Package className="size-4 text-primary" aria-hidden /> Phần 2 · Chuẩn bị (100% Screen-Free)</h4>
        <ul className="list-inside list-disc space-y-1 leading-relaxed">{plan.preparation.map((o, i) => <li key={i}>{o}</li>)}</ul>
      </section>
      </>
      )}
      <section>
        <h4 className="mb-1.5 flex items-center gap-2 font-bold"><Play className="size-4 text-primary" aria-hidden /> Phần 3 · Cách chơi & luật chơi</h4>
        <ol className="space-y-2">
          {plan.procedure.map((s, i) => (
            <li key={i} className="rounded-xl border p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", PHASE[s.phase].tone)}>{PHASE[s.phase].label}</span>
                <span className="font-semibold">{s.title}</span>
                <span className="text-xs text-muted-foreground">{s.duration} phút</span>
              </div>
              <p className="leading-relaxed">{s.instructions}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">💡 {s.teacherTip}</p>
            </li>
          ))}
        </ol>
      </section>
      {!procedureOnly && (
        <section className="rounded-2xl bg-lilac-soft/70 p-4">
          <h4 className="mb-1.5 flex items-center gap-2 font-bold text-lilac-strong"><Quote className="size-4" aria-hidden /> Lời dẫn mẫu của cô</h4>
          <p className="leading-relaxed italic">{plan.teacherScript}</p>
        </section>
      )}
    </div>
  );
}
