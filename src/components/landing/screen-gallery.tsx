import { cn } from "@/lib/utils";
import { BrowserFrame } from "./device-frames";
import { SCREENS, type Screen } from "./screens";

const ROWS: { screens: Screen[]; reverse: boolean }[] = [
  { screens: [SCREENS.plan, SCREENS.assess, SCREENS.print, SCREENS.create], reverse: false },
  { screens: [SCREENS.principal, SCREENS.cards, SCREENS.create, SCREENS.plan], reverse: true },
];

/** Hai dải ảnh màn hình thật trôi ngược chiều nhau (dừng khi rê chuột); bản lặp chỉ để nối vòng nên ẩn với trình đọc màn hình. */
export function ScreenGallery() {
  return (
    <div className="group/gallery relative space-y-6 overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
      {ROWS.map((row, r) => (
        <div key={r} className={cn("flex w-max gap-6 pr-6", row.reverse ? "animate-marquee-reverse" : "animate-marquee-slow")}>
          {[...row.screens, ...row.screens].map((screen, i) => (
            <div key={i} aria-hidden={i >= row.screens.length} className="w-[20rem] shrink-0 transition-transform duration-500 hover:-translate-y-1.5 sm:w-[26rem]">
              <BrowserFrame screen={screen} cover sizes="26rem" className="shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)]" />
              <p className="mt-3 text-center text-sm font-medium text-slate-500">{screen.label}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
