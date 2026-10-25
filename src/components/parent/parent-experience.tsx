"use client";

import { useState } from "react";
import Image from "next/image";
import { HeartHandshake, MessageCircleHeart, Moon, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { FeedbackResponse } from "@/core/constants/status";
import type { ParentCardContent } from "@/core/schemas/parent-card.schema";

export interface ParentView {
  student: { id: string; fullName: string; emoji: string; className: string };
  teacherName: string;
  gameName: string | null;
  card: ParentCardContent;
  feedback: { response: FeedbackResponse; message: string | null } | null;
}

/** Màn hình 7 – Mobile web, đọc trong 30 giây, phản hồi 1 chạm. */
export function ParentExperience({ token, view }: { token: string; view: ParentView }) {
  const [response, setResponse] = useState<FeedbackResponse | null>(view.feedback?.response ?? null);
  const [message, setMessage] = useState(view.feedback?.message ?? "");
  const [thanks, setThanks] = useState(false);
  const [busy, setBusy] = useState<FeedbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (value: FeedbackResponse) => {
    setBusy(value);
    setError(null);
    try {
      await api("/api/feedback", { method: "POST", body: { token, response: value, message: message.trim() || undefined } });
      setResponse(value);
      setThanks(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Chưa gửi được, bố mẹ thử lại giúp cô nhé.");
    } finally {
      setBusy(null);
    }
  };

  const { card, student } = view;
  return (
    <div className="pb-8 bg-white min-h-dvh">
      <header className="flex items-center gap-2.5 bg-blue-50/80 border-b border-blue-100 px-4 py-2.5 text-xs font-bold text-primary">
        <Image src="/stuguide-icon.png" alt="StuGuide" width={22} height={22} className="size-5 object-contain" />
        StuGuide · Không cần cài đặt ứng dụng
      </header>

      <section className="px-5 pt-5">
        <div className="flex items-center gap-3.5">
          <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-tr from-amber-300 to-orange-400 text-3xl shadow-sm border border-amber-200" aria-hidden>
            {student.emoji}
          </span>
          <div>
            <h1 className="text-xl leading-tight font-black text-slate-900">{student.fullName}</h1>
            <p className="text-sm font-semibold text-slate-500">{student.className} · {view.teacherName}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600 font-medium leading-relaxed">{card.greeting}</p>
      </section>

      <section className="mx-5 mt-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-soft">
        <h2 className="mb-2 flex items-center gap-2 text-base font-extrabold text-slate-900">
          <MessageCircleHeart className="size-5 text-primary" aria-hidden /> Hôm nay ở lớp con làm gì? 🎒
        </h2>
        {view.gameName && <Badge tone="success" className="mb-2.5 font-bold">{view.gameName}</Badge>}
        <p className="text-[15px] leading-relaxed text-slate-700 font-medium">{card.classSummary}</p>
      </section>

      <section className="mx-5 mt-4 rounded-3xl bg-purple-50/80 border border-purple-100 p-5 shadow-2xs">
        <h2 className="mb-2 flex items-center gap-2 text-base font-extrabold text-purple-900">
          <Moon className="size-5 text-purple-600" aria-hidden /> Nhiệm vụ {card.duration} phút tối nay cùng con 🌙
        </h2>
        <p className="mb-2 text-sm font-bold text-purple-950">{card.missionTitle}</p>
        <ul className="space-y-2">
          {card.eqQuestions.map((q) => (
            <li key={q} className="rounded-2xl bg-white/90 border border-purple-100/70 px-4 py-3 text-[15px] leading-snug font-medium text-slate-800 shadow-2xs">
              {q}
            </li>
          ))}
        </ul>
        <p className="mt-3.5 flex gap-2 text-sm font-bold text-purple-800">
          <HeartHandshake className="mt-0.5 size-4 shrink-0 text-purple-600" aria-hidden /> {card.adultRole}
        </p>
      </section>

      <section className="mx-5 mt-5">
        <h2 className="mb-3 text-base font-black text-slate-900">Bố mẹ phản hồi giúp cô nhé 💖</h2>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nhắn gửi cô giáo (tùy chọn)…"
          className="mb-3 min-h-16 bg-slate-50/70 focus:bg-white border-slate-200"
          aria-label="Lời nhắn cho cô giáo"
        />
        <div className="grid gap-3">
          <button
            type="button"
            aria-pressed={response === "completed"}
            disabled={busy !== null}
            onClick={() => send("completed")}
            className={cn(
              "min-h-15 rounded-2xl text-base font-extrabold transition-all active:scale-[0.98] shadow-2xs flex items-center justify-center gap-2",
              response === "completed"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-soft"
                : "border-2 border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
            )}
          >
            <span>🎉</span> Bé đã hoàn thành rất vui
          </button>
          <button
            type="button"
            aria-pressed={response === "needs_practice"}
            disabled={busy !== null}
            onClick={() => send("needs_practice")}
            className={cn(
              "min-h-15 rounded-2xl text-base font-extrabold transition-all active:scale-[0.98] shadow-2xs flex items-center justify-center gap-2",
              response === "needs_practice"
                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-soft"
                : "border-2 border-amber-300 bg-white text-amber-800 hover:bg-amber-50"
            )}
          >
            <span>💡</span> Bé cần rèn thêm
          </button>
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-coral-soft px-3 py-2 text-sm font-bold text-coral-strong">{error}</p>}
        {thanks && (
          <p role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-extrabold text-emerald-800 animate-pop-in shadow-2xs">
            ✨ Cảm ơn bố mẹ! Cô giáo đã nhận được phản hồi của gia đình rồi ạ!
          </p>
        )}
      </section>
    </div>
  );
}
