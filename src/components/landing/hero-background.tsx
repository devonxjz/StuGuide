"use client";

import { useEffect, useRef } from "react";

/** Độ mờ tối thiểu của nền khi đã cuộn qua hết hero. */
const MIN_OPACITY = 0;

/**
 * Nền hero: vài mảng màu loang trôi chậm (không theo chuột), nhạt dần khi cuộn xuống.
 * Hình trang trí truyền vào qua children và đứng yên.
 */
export function HeroBackground({ children }: { children?: React.ReactNode }) {
  const colorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = colorRef.current;
    if (!layer) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const progress = Math.min(1, window.scrollY / (window.innerHeight * 0.9));
      layer.style.opacity = String(Math.max(MIN_OPACITY, 1 - progress));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div ref={colorRef} className="absolute inset-0">
        <div className="animate-aurora absolute -top-40 left-[8%] size-[38rem] rounded-full bg-blue-300/35 blur-3xl" />
        <div className="animate-aurora absolute -top-24 right-[4%] size-[34rem] rounded-full bg-violet-300/35 blur-3xl [animation-delay:-6s]" />
        <div className="animate-aurora absolute top-[34%] left-[34%] size-[28rem] rounded-full bg-pink-200/35 blur-3xl [animation-delay:-12s]" />
        <div className="animate-aurora absolute top-[48%] -left-24 size-[26rem] rounded-full bg-amber-200/40 blur-3xl [animation-delay:-3s]" />
      </div>
      {children}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-white" />
    </div>
  );
}
