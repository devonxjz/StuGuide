import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 group select-none", className)}>
      <div className="relative shrink-0 transition-transform duration-300">
        <div className="grid size-10 place-items-center rounded-2xl bg-white p-1 shadow-soft border border-blue-100 transition-all duration-300 group-hover:shadow-[0_4px_16px_rgba(0,82,204,0.18)] group-hover:border-blue-300">
          <Image
            src="/stuguide-icon.png"
            alt="StuGuide Logo Icon"
            width={36}
            height={36}
            className="size-7.5 object-contain"
            priority
          />
        </div>
        <span className="absolute -top-1 -right-1 grid size-3.5 place-items-center rounded-full bg-sun ring-2 ring-white shadow-2xs">
          <span className="size-1.5 rounded-full bg-white" />
        </span>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-[18px] font-extrabold tracking-tight text-[#0052cc] group-hover:text-primary-strong transition-colors">
              StuGuide
            </span>
          </div>
          <span className="block text-[11px] font-semibold text-[#0052cc]/75 tracking-tight">
            Lakofoxygen team
          </span>
        </div>
      )}
    </div>
  );
}
