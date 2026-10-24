import { Check, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Các bước THẬT của pipeline soạn giáo án (server đẩy về từng bước qua stream). */
export const GENERATION_STEPS = [
  { key: "legal", label: "Tra cứu VBHN 01" },
  { key: "safety", label: "Kiểm tra Thông tư 45" },
  { key: "generate", label: "Sinh kịch bản & Flashcard" },
  { key: "review", label: "Chấm theo tiêu chí" },
] as const;

export type GenerationStepKey = (typeof GENERATION_STEPS)[number]["key"] | "revise";

/** Thanh tiến trình khi AI soạn giáo án; "revise" = AI đang tự sửa theo tiêu chí chưa đạt. */
export function AiLoadingStepper({ current, revisions = 0 }: { current: GenerationStepKey | null; revisions?: number }) {
  const index = GENERATION_STEPS.findIndex((s) => s.key === (current === "revise" ? "generate" : current));
  return (
    <div className="space-y-2">
      <ol className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Tiến trình soạn giáo án">
        {GENERATION_STEPS.map((step, i) => {
          const done = i < index;
          const active = i === index;
          return (
            <li key={step.key} className={cn("flex items-center gap-2 text-sm", done || active ? "text-foreground" : "text-muted-foreground/70")}>
              <span className={cn("grid size-6 place-items-center rounded-full text-[11px] font-bold", done ? "bg-primary text-primary-foreground" : active ? "bg-lilac-soft text-lilac-strong" : "bg-muted")}>
                {done ? <Check className="size-3.5" aria-hidden /> : active ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : i + 1}
              </span>
              <span className={cn(active && "font-semibold")}>{step.key === "generate" && current === "revise" ? "AI tự sửa theo tiêu chí" : step.label}</span>
            </li>
          );
        })}
      </ol>
      {revisions > 0 && <p className="text-xs text-muted-foreground">Bản trước chưa đạt một số tiêu chí, AI đã tự sửa {revisions} lần.</p>}
    </div>
  );
}
