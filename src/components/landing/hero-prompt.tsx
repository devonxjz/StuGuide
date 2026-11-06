"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUp, ShieldCheck } from "lucide-react";

const EXAMPLES = [
  "Soạn trò chơi vận động cho lớp 4–5 tuổi với bóng và rổ nhựa",
  "Gợi ý hoạt động khám phá màu sắc cho lớp Mầm",
  "Viết thẻ nhiệm vụ 5 phút để bố mẹ chơi cùng con tối nay",
  "Bé nào trong lớp cần quan sát thêm tuần này?",
];

const SUGGESTIONS = [
  { label: "Soạn giáo án", tone: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" },
  { label: "Kiểm tra an toàn vật liệu", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  { label: "Thẻ cho phụ huynh", tone: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" },
  { label: "In flashcard A4", tone: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100" },
];

const TYPE_MS = 45;
const HOLD_MS = 1800;

/** Ô chat giả ở hero: tự gõ các câu mẫu để người xem hình dung, bấm vào là đi tới đăng nhập. */
export function HeroPrompt() {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLength(EXAMPLES[0].length);
      return;
    }
    const full = EXAMPLES[index].length;
    const id = window.setTimeout(
      () => {
        if (length < full) setLength(length + 1);
        else {
          setLength(0);
          setIndex((index + 1) % EXAMPLES.length);
        }
      },
      length < full ? TYPE_MS : HOLD_MS,
    );
    return () => window.clearTimeout(id);
  }, [index, length]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/login"
        aria-label="Bắt đầu chat với StuGuide"
        className="group relative block rounded-2xl border border-violet-200 bg-white shadow-[0_20px_60px_-24px_rgba(79,70,229,0.4)] transition-all hover:border-violet-300 hover:shadow-[0_24px_70px_-20px_rgba(79,70,229,0.5)]"
      >
        <div className="rounded-2xl p-4 text-left">
          <p className="min-h-12 text-base text-slate-800 sm:text-lg">
            <span className="typing-caret">{EXAMPLES[index].slice(0, length)}</span>
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="size-3.5 text-emerald-500" aria-hidden /> AI soạn nháp · cô duyệt cuối
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-blue-600 text-white transition-colors group-hover:bg-blue-700">
              <ArrowUp className="size-4" aria-hidden />
            </span>
          </div>
        </div>
      </Link>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <Link key={s.label} href="/login" className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${s.tone}`}>
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
