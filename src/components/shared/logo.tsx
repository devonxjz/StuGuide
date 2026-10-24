import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.7_0.15_130)] text-primary-foreground shadow-soft">
        <Sprout className="size-5" aria-hidden />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-tight">Mầm Học AI</span>
          <span className="block text-[11px] font-medium text-muted-foreground">StuGuide</span>
        </span>
      )}
    </div>
  );
}
