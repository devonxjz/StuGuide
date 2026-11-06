import { cn } from "@/lib/utils";

/**
 * Khung trang cho phụ huynh: co giãn theo màn hình. Điện thoại chiếm toàn màn hình;
 * máy tính bảng và máy tính hiện một tờ giấy ở giữa (rộng dần tới 42rem), không giả lập khung điện thoại.
 */
export function MobileFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh bg-slate-50 sm:px-6 sm:py-8">
      <div className={cn("mx-auto w-full overflow-hidden bg-background sm:max-w-2xl sm:rounded-3xl sm:border sm:shadow-xl lg:max-w-3xl", className)}>{children}</div>
    </div>
  );
}
