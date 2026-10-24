"use client";

import { useState } from "react";
import { HeartHandshake, MessageCircleHeart, Moon, Sprout } from "lucide-react";
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
    <div className="pb-8">
      <header className="flex items-center gap-2 bg-primary-soft px-4 py-3 text-xs font-semibold text-primary-strong">
        <Sprout className="size-4" aria-hidden /> Mầm Học AI – Không cần cài đặt ứng dụng
      </header>

      <section className="px-5 pt-5">
        <div className="flex items-center gap-3">
          <span className="grid size-14 place-items-center rounded-2xl bg-sun-soft text-3xl" aria-hidden>{student.emoji}</span>
          <div>
            <h1 className="text-xl leading-tight font-bold">{student.fullName}</h1>
            <p className="text-sm text-muted-foreground">{student.className} · {view.teacherName}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{card.greeting}</p>
      </section>

      <section className="mx-5 mt-4 rounded-3xl border bg-card p-5 shadow-soft">
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold">
          <MessageCircleHeart className="size-5 text-primary" aria-hidden /> Hôm nay ở lớp con làm gì?
        </h2>
        {view.gameName && <Badge tone="success" className="mb-2">{view.gameName}</Badge>}
        <p className="text-[15px] leading-relaxed">{card.classSummary}</p>
      </section>

      <section className="mx-5 mt-4 rounded-3xl bg-lilac-soft p-5">
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-lilac-strong">
          <Moon className="size-5" aria-hidden /> Nhiệm vụ {card.duration} phút tối nay cùng con
        </h2>
        <p className="mb-2 text-sm font-semibold">{card.missionTitle}</p>
        <ul className="space-y-2">
          {card.eqQuestions.map((q) => (
            <li key={q} className="rounded-2xl bg-card/80 px-4 py-3 text-[15px] leading-snug">{q}</li>
          ))}
        </ul>
        <p className="mt-3 flex gap-2 text-sm text-lilac-strong">
          <HeartHandshake className="mt-0.5 size-4 shrink-0" aria-hidden /> {card.adultRole}
        </p>
      </section>

      <section className="mx-5 mt-5">
        <h2 className="mb-3 text-base font-bold">Bố mẹ phản hồi giúp cô nhé</h2>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nhắn gửi cô giáo (tùy chọn)…"
          className="mb-3 min-h-16"
          aria-label="Lời nhắn cho cô giáo"
        />
        <div className="grid gap-3">
          <button
            type="button"
            aria-pressed={response === "completed"}
            disabled={busy !== null}
            onClick={() => send("completed")}
            className={cn(
              "min-h-16 rounded-2xl text-lg font-bold transition-all active:scale-[0.98] shadow-2xs",
              response === "completed"
                ? "bg-mint text-white shadow-soft"
                : "border-2 border-mint/40 bg-card text-mint-strong hover:bg-mint-soft/50"
            )}
          >
            ✅ Bé đã hoàn thành
          </button>
          <button
            type="button"
            aria-pressed={response === "needs_practice"}
            disabled={busy !== null}
            onClick={() => send("needs_practice")}
            className={cn(
              "min-h-16 rounded-2xl text-lg font-bold transition-all active:scale-[0.98] shadow-2xs",
              response === "needs_practice"
                ? "bg-sun text-white shadow-soft"
                : "border-2 border-sun/50 bg-card text-sun-strong hover:bg-sun-soft/50"
            )}
          >
            🌟 Bé cần rèn thêm
          </button>
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral-strong">{error}</p>}
        {thanks && (
          <p role="status" className="mt-4 rounded-2xl border border-mint/30 bg-mint-soft p-4 text-center text-sm font-bold text-mint-strong animate-pop-in">
            Cảm ơn bố mẹ! Cô giáo đã nhận được phản hồi rồi ạ ✨
          </p>
        )}
      </section>

    </div>
  );
}
