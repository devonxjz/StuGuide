import { cn } from "@/lib/utils";

/** Vòng tròn % (tỷ lệ hoàn thành của phụ huynh). */
export function ProgressRing({ value, size = 112, label, className }: { value: number; size?: number; label?: string; className?: string }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }} role="img" aria-label={`${pct}% ${label ?? ""}`.trim()}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--primary-soft)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl leading-none font-bold tabular-nums" data-testid="ring-value">{pct}%</div>
        {label && <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>}
      </div>
    </div>
  );
}
