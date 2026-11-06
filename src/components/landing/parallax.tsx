"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Dịch chuyển nhẹ theo trục dọc khi cuộn (lớp gần trôi nhanh hơn lớp xa) để ảnh có chiều sâu.
 * `speed` > 0 trôi lên khi cuộn xuống. Chỉ chạy trên màn hình rộng (điện thoại xếp dọc, dịch chuyển dễ đè lên chữ)
 * và tắt khi người dùng chọn giảm chuyển động.
 */
const MAX_SHIFT_PX = 120;

export function Parallax({ children, speed = 0.08, className }: { children: React.ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const wide = window.matchMedia("(min-width: 1024px)");
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!wide.matches) {
        el.style.transform = "";
        return;
      }
      // Đo vị trí gốc (bỏ dịch chuyển đang áp) để không bị cộng dồn; 0 khi tâm phần tử ở giữa màn hình
      const rect = el.getBoundingClientRect();
      const current = new DOMMatrixReadOnly(getComputedStyle(el).transform === "none" ? undefined : getComputedStyle(el).transform).m42;
      const offset = rect.top - current + rect.height / 2 - window.innerHeight / 2;
      const shift = Math.max(-MAX_SHIFT_PX, Math.min(MAX_SHIFT_PX, -offset * speed));
      el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [speed]);

  return (
    <div ref={ref} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}
