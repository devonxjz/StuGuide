"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ClipboardCheck, FileText, HeartHandshake, Printer, Wand2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrowserFrame } from "./device-frames";
import { SCREENS, type Screen } from "./screens";

interface Chapter {
  screen: Screen;
  icon: LucideIcon;
  tone: string;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
}

const CHAPTERS: Chapter[] = [
  {
    screen: SCREENS.create,
    icon: Wand2,
    tone: "bg-blue-600",
    eyebrow: "Bước 1 · Soạn",
    title: "Chọn vài ô là có giáo án – không cần viết câu lệnh",
    body: "Độ tuổi, mảng phát triển, chủ đề, học liệu có sẵn trong lớp. Thích nói chuyện hơn thì cô nhắn hoặc bấm mic nói thẳng với trợ lý.",
    points: ["Ưu tiên STEM hoặc trò chơi dân gian", "Gợi ý học liệu tái chế có sẵn"],
  },
  {
    screen: SCREENS.plan,
    icon: FileText,
    tone: "bg-violet-600",
    eyebrow: "Bước 2 · Kiểm",
    title: "Giáo án có căn cứ pháp lý và cảnh báo an toàn",
    body: "Mỗi giáo án đối chiếu VBHN 01/VBHN-BGDĐT và Thông tư 45, tự cảnh báo vật liệu có cạnh sắc hay vật nhỏ trẻ dễ ngậm.",
    points: ["Đủ 4 phần: mục tiêu, chuẩn bị, tiến trình, lời dẫn", "AI soạn – cô duyệt trước khi dùng"],
  },
  {
    screen: SCREENS.print,
    icon: Printer,
    tone: "bg-amber-500",
    eyebrow: "Bước 3 · In",
    title: "Flashcard A4 in ngay cho trẻ tô màu",
    body: "Học liệu đi kèm giáo án được dàn trang sẵn khổ A4, lưu PDF hoặc in thẳng – không cần thiết kế thêm.",
    points: ["Hình nét to, dễ tô cho trẻ 3–6 tuổi", "Một chạm: In / Lưu PDF"],
  },
  {
    screen: SCREENS.assess,
    icon: ClipboardCheck,
    tone: "bg-emerald-600",
    eyebrow: "Bước 4 · Quan sát",
    title: "Ghi nhận quan sát cả lớp trong 30 giây",
    body: "Tiêu chí lấy từ chính giáo án hôm nay. Cô chỉ chạm Tốt · Đã đạt · Cần rèn thêm; StuGuide lưu thành hồ sơ minh chứng.",
    points: ["Đánh dấu cả lớp bằng một nút", "Phát hiện sớm bé cần quan sát sâu"],
  },
  {
    screen: SCREENS.cards,
    icon: HeartHandshake,
    tone: "bg-rose-500",
    eyebrow: "Bước 5 · Kết nối",
    title: "Thẻ 5 phút cho phụ huynh, cô thấy ai đã cùng con làm",
    body: "Mỗi hoạt động sinh kèm một thẻ ngắn để bố mẹ trò chuyện, chơi tiếp cùng con ở nhà – phản hồi về lớp theo thời gian thực.",
    points: ["Không cần màn hình cho trẻ", "Theo dõi Xong · Cần hỗ trợ · Chưa"],
  },
];

/**
 * Tour sản phẩm kiểu "cuộn kể chuyện": cột chữ cuộn bình thường, khung ảnh bên phải dính lại và
 * đổi màn hình theo chương đang ở giữa màn hình. Trên điện thoại mỗi chương hiện ảnh ngay bên dưới.
 */
export function ProductTour() {
  const [active, setActive] = useState(0);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      // chỉ tính chương đang đi qua dải giữa màn hình
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const el of chapterRefs.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <ol className="space-y-16 lg:space-y-0">
        {CHAPTERS.map((c, i) => (
          <li
            key={c.title}
            ref={(el) => {
              chapterRefs.current[i] = el;
            }}
            data-index={i}
            className="lg:flex lg:min-h-[78vh] lg:items-center"
          >
            <div className={cn("transition-opacity duration-500", active === i ? "lg:opacity-100" : "lg:opacity-35")}>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                <span className={cn("grid size-8 place-items-center rounded-lg text-white shadow-sm", c.tone)}>
                  <c.icon className="size-4" aria-hidden />
                </span>
                {c.eyebrow}
              </span>
              <h3 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h3>
              <p className="mt-3 leading-relaxed text-slate-600">{c.body}</p>
              <ul className="mt-5 space-y-2">
                {c.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
              {/* Điện thoại / máy tính bảng: ảnh ngay dưới chữ */}
              <BrowserFrame screen={c.screen} cover sizes="100vw" className="mt-8 lg:hidden" />
            </div>
          </li>
        ))}
      </ol>

      <div className="relative hidden lg:block">
        <div className="sticky top-[calc(50vh-15rem)]">
          <div aria-hidden className="absolute -inset-10 -z-10 rounded-[3rem] bg-gradient-to-br from-blue-100 via-violet-100 to-rose-100 opacity-70 blur-2xl" />
          <div className="relative aspect-[16/11]">
            {CHAPTERS.map((c, i) => (
              <div
                key={c.title}
                aria-hidden={active !== i}
                className={cn(
                  "absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  active === i ? "translate-y-0 scale-100 opacity-100" : i < active ? "-translate-y-6 scale-[0.97] opacity-0" : "translate-y-6 scale-[0.97] opacity-0",
                )}
              >
                <BrowserFrame screen={c.screen} cover sizes="(min-width: 1280px) 720px, 58vw" />
              </div>
            ))}
          </div>
          {/* Chấm tiến trình */}
          <div className="mt-6 flex items-center justify-center gap-2" aria-hidden>
            {CHAPTERS.map((c, i) => (
              <span key={c.title} className={cn("h-1.5 rounded-full transition-all duration-500", active === i ? cn("w-8", c.tone) : "w-1.5 bg-slate-300")} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
