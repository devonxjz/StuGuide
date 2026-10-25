import { cn } from "@/lib/utils";

/** Khung điện thoại cho giao diện phụ huynh: trên desktop hiện như máy thật, trên mobile chiếm toàn màn hình. */
export function MobileFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_30%_20%,var(--primary-soft),transparent_55%),radial-gradient(circle_at_80%_80%,var(--sun-soft),transparent_50%)] sm:p-6">
      <div className={cn("w-full bg-background sm:max-w-[420px] sm:overflow-hidden sm:rounded-[2.5rem] sm:border-[10px] sm:border-foreground/90 sm:shadow-2xl", className)}>{children}</div>
    </div>
  );
}
