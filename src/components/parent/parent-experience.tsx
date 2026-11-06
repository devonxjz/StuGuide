"use client";

import { useState } from "react";
import Image from "next/image";

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
    <div className="min-h-dvh bg-white pb-8 sm:min-h-0 sm:pb-10">
      <header className="flex items-center gap-2.5 bg-blue-50/80 border-b border-blue-100 px-4 py-2.5 text-xs font-bold text-primary sm:px-8">
        <Image src="/stuguide-icon.png" alt="StuGuide" width={22} height={22} className="size-5 object-contain" />
        StuGuide · Không cần cài đặt ứng dụng
      </header>

      <section className="px-5 pt-5 sm:px-8 sm:pt-8">
        <div className="flex items-center gap-3.5">
          <span className="grid size-14 place-items-center rounded-full bg-slate-100 text-xl font-medium text-slate-600" aria-hidden>
            {student.fullName.trim().split(" ").pop()?.charAt(0)}
          </span>
          <div>
            <h1 className="text-xl leading-tight font-semibold text-slate-900 sm:text-2xl">{student.fullName}</h1>
            <p className="text-sm font-semibold text-slate-500">{student.className} · {view.teacherName}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600 font-medium leading-relaxed">{card.greeting}</p>
      </section>

      <section className="mx-5 mt-4 rounded-xl border border-slate-200/90 bg-white p-5 sm:mx-8 sm:p-6">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-900">
          Hôm nay ở lớp con làm gì?
        </h2>
        {view.gameName && <Badge tone="success" className="mb-2.5 font-bold">{view.gameName}</Badge>}
        <p className="text-[15px] leading-relaxed font-medium text-slate-700 sm:text-base">{card.classSummary}</p>
      </section>

      <section className="mx-5 mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:mx-8 sm:p-6">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-900">
          Nhiệm vụ {card.duration} phút tối nay cùng con
        </h2>
        <p className="mb-2 text-sm font-bold text-slate-900">{card.missionTitle}</p>
        <ul className="space-y-2">
          {card.eqQuestions.map((q) => (
            <li key={q} className="rounded-xl bg-white/90 border border-slate-200 px-4 py-3 text-[15px] leading-snug font-medium text-slate-800">
              {q}
            </li>
          ))}
        </ul>
        <p className="mt-3.5 flex gap-2 text-sm font-bold text-slate-700">
          {card.adultRole}
        </p>
      </section>

      <section className="mx-5 mt-5 sm:mx-8 sm:mt-6">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Bố mẹ phản hồi giúp cô nhé</h2>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nhắn gửi cô giáo (tùy chọn)…"
          className="mb-3 min-h-16 bg-slate-50/70 focus:bg-white border-slate-200"
          aria-label="Lời nhắn cho cô giáo"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={response === "completed"}
            disabled={busy !== null}
            onClick={() => send("completed")}
            className={cn(
              "min-h-15 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2",
              response === "completed"
                ? "bg-emerald-600 text-white"
                : "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
            )}
          >
            Bé đã hoàn thành rất vui
          </button>
          <button
            type="button"
            aria-pressed={response === "needs_practice"}
            disabled={busy !== null}
            onClick={() => send("needs_practice")}
            className={cn(
              "min-h-15 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2",
              response === "needs_practice"
                ? "bg-amber-500 text-white"
                : "border border-amber-300 bg-white text-amber-800 hover:bg-amber-50"
            )}
          >
            Bé cần rèn thêm
          </button>
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-coral-soft px-3 py-2 text-sm font-bold text-coral-strong">{error}</p>}
        {thanks && (
          <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-800 animate-pop-in">
            Cảm ơn bố mẹ! Cô giáo đã nhận được phản hồi của gia đình rồi ạ!
          </p>
        )}
      </section>
    </div>
  );
}
