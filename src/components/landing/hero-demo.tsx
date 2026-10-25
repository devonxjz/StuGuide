"use client";

import { useEffect, useState } from "react";
import { Check, FileText, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const PROMPT = "Soạn trò chơi vận động cho lớp 4–5 tuổi với bóng và rổ nhựa";
const STEPS = ["Tra cứu VBHN 01", "Kiểm tra an toàn TT 45", "Sinh kịch bản & flashcard"];

// Mốc thời gian (ms) của một vòng demo
const TYPE_MS = 38;
const TYPE_END = PROMPT.length * TYPE_MS + 400;
const STEP_MS = 900;
const PLAN_AT = TYPE_END + STEPS.length * STEP_MS + 300;
const LOOP_MS = PLAN_AT + 5200;

/** Mô phỏng một phiên chat soạn giáo án, lặp vô hạn – minh họa cho landing page. */
export function HeroDemo() {
  const [t, setT] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setT(PLAN_AT + 1000);
      return;
    }
    const start = performance.now();
    const id = window.setInterval(() => setT((performance.now() - start) % LOOP_MS), 40);
    return () => window.clearInterval(id);
  }, []);

  const typed = PROMPT.slice(0, Math.floor(t / TYPE_MS));
  const sent = t >= TYPE_END;
  const stepIndex = sent ? Math.floor((t - TYPE_END) / STEP_MS) : -1;
  const showPlan = t >= PLAN_AT;

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div aria-hidden className="absolute -inset-x-10 -top-10 -bottom-6 -z-10 rounded-[3rem] bg-gradient-to-tr from-blue-500/15 via-violet-500/10 to-sky-400/15 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.18)]">
        {/* Thanh cửa sổ */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-slate-300" />
          <span className="size-2.5 rounded-full bg-slate-300" />
          <span className="size-2.5 rounded-full bg-slate-300" />
          <span className="ml-3 rounded-md bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200">
            app.stuguide.vn/teacher
          </span>
        </div>

        <div className="space-y-4 p-5 sm:p-6 min-h-[22rem] text-left">
          {sent && (
            <div className="flex justify-end animate-fade-up">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-sm text-white">{PROMPT}</p>
            </div>
          )}

          {sent && (
            <div className="flex items-start gap-3 animate-fade-up">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-tr from-primary to-violet-500 text-white">
                <Sparkles className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <ol className="space-y-1.5">
                  {STEPS.map((s, i) => {
                    const done = i < stepIndex;
                    const active = i === stepIndex;
                    if (i > stepIndex) return null;
                    return (
                      <li key={s} className="flex items-center gap-2 text-[13px] animate-fade-up">
                        {done ? (
                          <Check className="size-3.5 text-emerald-600" aria-hidden />
                        ) : (
                          <LoaderCircle className="size-3.5 animate-spin text-violet-600" aria-hidden />
                        )}
                        <span className={cn(done ? "text-slate-500" : active && "text-shimmer font-medium")}>{s}</span>
                      </li>
                    );
                  })}
                </ol>

                {showPlan && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-fade-up">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-primary" aria-hidden />
                        <span className="text-sm font-semibold text-slate-900">Ném bóng vào rổ – Lớp Chồi</span>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                        <ShieldCheck className="size-3" aria-hidden /> An toàn
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      {[
                        ["Mục tiêu", "Vận động thô"],
                        ["Thời lượng", "25 phút"],
                        ["Chuẩn", "VBHN 01"],
                      ].map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-slate-50 px-2.5 py-2">
                          <div className="text-slate-400">{k}</div>
                          <div className="font-medium text-slate-700">{v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="h-2 w-full rounded-full bg-slate-100" />
                      <div className="h-2 w-4/5 rounded-full bg-slate-100" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ô nhập */}
        <div className="border-t border-slate-100 p-3">
          <div className="ai-border rounded-xl" data-active={!sent}>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
              <span className={cn("flex-1 truncate", typed && !sent ? "text-slate-800 typing-caret" : "text-slate-400")}>
                {sent ? "Nhắn cho StuGuide…" : typed || "Nhắn cho StuGuide…"}
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-slate-900 text-white">
                <Sparkles className="size-3.5" aria-hidden />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
