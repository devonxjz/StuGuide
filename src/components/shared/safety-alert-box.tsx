import { TriangleAlert, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SafetyWarning } from "@/core/schemas/lesson-plan.schema";

const LEVEL = {
  critical: { box: "bg-coral-soft text-coral-strong border-coral/40", icon: ShieldAlert, label: "Nghiêm cấm" },
  warning: { box: "bg-sun-soft text-sun-strong border-sun/50", icon: TriangleAlert, label: "Lưu ý an toàn" },
  info: { box: "bg-sky-soft text-sky-strong border-sky/40", icon: Info, label: "Nhắc nhở" },
} as const;

/** Hộp cảnh báo an toàn vật lý theo Thông tư 45/2021 (nền vàng cam nổi bật). */
export function SafetyAlertBox({ warnings }: { warnings: SafetyWarning[] }) {
  return (
    <section aria-label="Cảnh báo an toàn" className="rounded-2xl border border-sun/50 bg-sun-soft/60 p-4">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-sun-strong">
        <TriangleAlert className="size-4" aria-hidden /> Cảnh báo an toàn · Thông tư 45/2021/TT-BGDĐT
      </h4>
      <ul className="space-y-2">
        {warnings.map((w, i) => {
          const meta = LEVEL[w.level];
          const Icon = meta.icon;
          return (
            <li key={i} className={cn("flex gap-2.5 rounded-xl border p-2.5 text-sm", meta.box)}>
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div>
                <span className="font-semibold">{meta.label} · {w.material}: </span>
                {w.description}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
