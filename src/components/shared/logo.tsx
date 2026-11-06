import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 group select-none", className)}>
      <div className="relative shrink-0 transition-transform duration-300">
        <div className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white p-1">
          <Image
            src="/stuguide-icon.png"
            alt="StuGuide Logo Icon"
            width={36}
            height={36}
            className="size-7.5 object-contain"
            priority
          />
        </div>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold tracking-tight text-slate-900">
              StuGuide
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
