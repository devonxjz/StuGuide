"use client";

import { useEffect, useRef } from "react";

/** Mỗi ô lưới mô phỏng ứng với SCALE px màn hình; càng lớn càng nhẹ máy, càng mềm. */
const SCALE = 2;
/** Hệ số tắt dần mỗi khung hình: 0.965^120 ≈ 0.014 nên gợn sóng lặng sau khoảng 2 giây ở 60fps. */
const DAMPING = 0.965;
/** Bán kính (ô) và lực nhấn của con trỏ xuống mặt nước. */
const BRUSH_RADIUS = 2;
const BRUSH_STRENGTH = 0.9;
/** Khoảng cách (ô) giữa hai lần chạm nước dọc đường chuột: thưa để ra từng gợn tròn nhỏ, không thành rãnh dài. */
const DROP_SPACING = 7;
/** Độ dốc mặt nước nhân với hệ số này để ra độ sáng/tối của gợn sóng. */
const LIGHT_GAIN = 0.4;
/** Dưới ngưỡng này coi như mặt nước đã phẳng, dừng vòng lặp cho nhẹ máy. */
const REST_THRESHOLD = 0.02;
/** Sóng tắt hẳn sau LIFE_MS kể từ lần chạm cuối, mờ dần trong FADE_MS cuối – kể cả trên máy chậm. */
const LIFE_MS = 2000;
const FADE_MS = 700;
/** Gợn sóng nhạt dần theo độ cuộn nhưng không biến mất hẳn. */
const MIN_INTENSITY = 0.35;

/**
 * Mặt nước 3D phủ toàn landing: con trỏ đi tới đâu, nước bị rẽ và sóng loang ra hai bên.
 * Mô phỏng phương trình sóng 2D trên lưới thưa, tô sáng/tối theo độ dốc để có cảm giác nổi khối.
 */
export function WaterRipple() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let cols = 0;
    let rows = 0;
    let current = new Float32Array(0);
    let previous = new Float32Array(0);
    let image: ImageData | null = null;
    let frame = 0;
    let last: { x: number; y: number } | null = null;
    let lastPressAt = 0;

    const resize = () => {
      cols = Math.ceil(window.innerWidth / SCALE);
      rows = Math.ceil(window.innerHeight / SCALE);
      canvas.width = cols;
      canvas.height = rows;
      current = new Float32Array(cols * rows);
      previous = new Float32Array(cols * rows);
      image = ctx.createImageData(cols, rows);
    };

    const intensity = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight || 1;
      return 1 - Math.min(1, window.scrollY / scrollable) * (1 - MIN_INTENSITY);
    };

    /** Nhấn mặt nước xuống quanh (cx, cy) theo hình nón để sóng loang tròn đều. */
    const press = (cx: number, cy: number) => {
      lastPressAt = performance.now();
      for (let dy = -BRUSH_RADIUS; dy <= BRUSH_RADIUS; dy++) {
        for (let dx = -BRUSH_RADIUS; dx <= BRUSH_RADIUS; dx++) {
          const x = Math.round(cx) + dx;
          const y = Math.round(cy) + dy;
          if (x < 1 || y < 1 || x >= cols - 1 || y >= rows - 1) continue;
          const falloff = 1 - Math.hypot(dx, dy) / (BRUSH_RADIUS + 1);
          if (falloff > 0) current[y * cols + x] -= BRUSH_STRENGTH * falloff;
        }
      }
    };

    /** Một bước phương trình sóng; trả về biên độ lớn nhất để biết khi nào nước đã lặng. */
    const step = () => {
      let peak = 0;
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          const i = y * cols + x;
          const next =
            ((current[i - 1] + current[i + 1] + current[i - cols] + current[i + cols]) / 2 - previous[i]) * DAMPING;
          previous[i] = next;
          const magnitude = next < 0 ? -next : next;
          if (magnitude > peak) peak = magnitude;
        }
      }
      [current, previous] = [previous, current];
      return peak;
    };

    /** Tô gợn sóng: sườn hướng về nguồn sáng (trên-trái) sáng trắng, sườn khuất tối xanh. */
    const render = (life: number) => {
      if (!image) return;
      const data = image.data;
      const level = intensity() * life;
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          const i = y * cols + x;
          const slope = (current[i - 1] - current[i + 1] + current[i - cols] - current[i + cols]) * LIGHT_GAIN;
          const p = i * 4;
          if (slope > 0) {
            data[p] = 255;
            data[p + 1] = 255;
            data[p + 2] = 255;
            data[p + 3] = Math.min(110, slope * 200) * level;
          } else {
            data[p] = 37;
            data[p + 1] = 99;
            data[p + 2] = 235;
            data[p + 3] = Math.min(35, -slope * 70) * level;
          }
        }
      }
      ctx.putImageData(image, 0, 0);
    };

    const tick = () => {
      const age = performance.now() - lastPressAt;
      const peak = step();
      if (peak > REST_THRESHOLD && age < LIFE_MS) {
        render(Math.min(1, (LIFE_MS - age) / FADE_MS));
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        current.fill(0);
        previous.fill(0);
        ctx.clearRect(0, 0, cols, rows);
      }
    };

    const onMove = (e: PointerEvent) => {
      const x = e.clientX / SCALE;
      const y = e.clientY / SCALE;
      // Chạm nước từng điểm cách nhau DROP_SPACING dọc đường chuột, kể cả khi lướt nhanh
      if (!last) {
        press(x, y);
        last = { x, y };
      } else {
        const distance = Math.hypot(x - last.x, y - last.y);
        const drops = Math.floor(distance / DROP_SPACING);
        for (let d = 1; d <= drops; d++) {
          const t = (d * DROP_SPACING) / distance;
          press(last.x + (x - last.x) * t, last.y + (y - last.y) * t);
        }
        if (drops > 0) {
          const t = (drops * DROP_SPACING) / distance;
          last = { x: last.x + (x - last.x) * t, y: last.y + (y - last.y) * t };
        }
      }
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      last = null;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-40 h-dvh w-screen" />;
}
