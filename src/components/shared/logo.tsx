import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 group", className)}>
      <span className="relative grid size-9.5 place-items-center rounded-xl bg-gradient-to-tr from-primary via-lilac to-sky text-white shadow-soft transition-transform duration-300 group-hover:scale-105">
        <Sprout className="size-5 transition-transform duration-300 group-hover:rotate-6" aria-hidden />
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-sun ring-2 ring-white animate-pulse-soft" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text">
            Mầm Học AI
          </span>
          <span className="block text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">StuGuide</span>
        </span>
      )}
    </div>
  );
}
