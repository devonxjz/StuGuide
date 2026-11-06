"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Cuộn quá ngưỡng này (px) thì thanh menu mới hiện nền */
const SCROLLED_AT = 8;

/**
 * Thanh menu dính đầu trang, không viền: ở đầu trang trong suốt hẳn để nền hero tràn lên phía sau;
 * cuộn xuống thì chỉ làm mờ phía sau (vẫn thấy màu nền) để chữ menu không lẫn vào nội dung.
 */
export function SiteHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > SCROLLED_AT);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className={cn(
        "sticky top-0 z-50 transition-[background-color,backdrop-filter] duration-300",
        scrolled ? "bg-white/40 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      {children}
    </header>
  );
}
