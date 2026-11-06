import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Screen } from "./screens";

/** Khung cửa sổ trình duyệt bao quanh ảnh chụp màn hình. */
export function BrowserFrame({
  screen,
  className,
  sizes = "(min-width: 1024px) 720px, 100vw",
  preload = false,
  cover = false,
}: {
  screen: Screen;
  className?: string;
  sizes?: string;
  preload?: boolean;
  /** Khung cố định tỉ lệ 16:10, ảnh phủ kín và neo mép trên (các ảnh có chiều cao khác nhau vẫn thẳng hàng) */
  cover?: boolean;
}) {
  return (
    <figure className={cn("overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_30px_80px_-24px_rgba(15,23,42,0.35)]", className)}>
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/90 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-rose-400" aria-hidden />
        <span className="size-2.5 rounded-full bg-amber-400" aria-hidden />
        <span className="size-2.5 rounded-full bg-emerald-400" aria-hidden />
        <span className="ml-3 truncate rounded-md bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200">{screen.url}</span>
      </div>
      {cover ? (
        <div className="relative aspect-[16/10] bg-white">
          <Image src={screen.src} alt={screen.alt} fill sizes={sizes} placeholder="blur" preload={preload} className="object-cover object-top" />
        </div>
      ) : (
        <Image src={screen.src} alt={screen.alt} sizes={sizes} placeholder="blur" preload={preload} className="block h-auto w-full" />
      )}
    </figure>
  );
}

/** Khung điện thoại (giao diện phụ huynh). Phần tai thỏ nằm trong dải trạng thái riêng phía trên, không che nội dung ảnh. */
export function PhoneFrame({ screen, className }: { screen: Screen; className?: string }) {
  return (
    <figure className={cn("rounded-[2.6rem] bg-slate-900 p-2.5 shadow-[0_40px_90px_-24px_rgba(15,23,42,0.55)] ring-1 ring-slate-700", className)}>
      <div className="overflow-hidden rounded-[2.1rem] bg-white">
        <div aria-hidden className="relative h-7 bg-white">
          <span className="absolute top-1.5 left-1/2 h-4 w-20 -translate-x-1/2 rounded-full bg-slate-900" />
        </div>
        <Image src={screen.src} alt={screen.alt} sizes="320px" placeholder="blur" className="block h-auto w-full" />
      </div>
    </figure>
  );
}
