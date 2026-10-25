"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api-client";
import type { CardData } from "@/types/chat";

export function ParentCardCard({ data, restored = false }: { data: Extract<CardData, { kind: "parent-card" }>; restored?: boolean }) {
  const [status, setStatus] = useState(data.status);

  useEffect(() => {
    if (!restored) return;
    let cancelled = false;
    api<{ card: { status: string } }>(`/api/cards/${data.cardId}`)
      .then((res) => !cancelled && setStatus(res.card.status))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data.cardId, restored]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/cards/${data.cardId}/send`, { method: "POST", body: {} });
      setStatus("sent");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-[44rem] animate-pop-in border-border/80 bg-card shadow-soft">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge tone="ai">
            <Smartphone aria-hidden /> Thẻ nhiệm vụ {data.content.duration} phút
          </Badge>
          <Badge tone={status === "sent" ? "info" : "neutral"}>{status === "sent" ? "Đã gửi" : "Bản nháp"}</Badge>
        </div>
        <CardTitle className="text-base font-bold text-foreground mt-1">{data.content.missionTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground font-medium">{data.content.greeting}</p>
        <p className="text-foreground leading-relaxed">{data.content.classSummary}</p>
        <div className="rounded-2xl border border-sky/20 bg-sky-soft/50 p-4">
          <p className="text-xs font-bold text-sky-strong mb-2">Gợi ý trò chuyện & kết nối cùng con:</p>
          <ul className="list-inside list-disc space-y-1.5 text-xs font-medium text-foreground">
            {data.content.eqQuestions.map((q) => (
              <li key={q} className="leading-relaxed">{q}</li>
            ))}
          </ul>
        </div>
        {data.awaiting === "send" && status !== "sent" && (
          <p role="status" className="rounded-xl border border-sky/20 bg-sky-soft/80 px-3.5 py-2 text-xs font-semibold text-sky-strong">
            Trợ lý không tự gửi cho phụ huynh. Cô đọc lại rồi bấm “Duyệt & Gửi cho phụ huynh” để xác nhận.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral-strong">
            {error}
          </p>
        )}
      </CardContent>
      <CardFooter className="border-t border-border/70 bg-muted/20 gap-2.5">
        {status !== "sent" ? (
          <Button onClick={send} disabled={busy} className="bg-sky text-white font-bold hover:brightness-105 shadow-soft">
            <Send /> {busy ? "Đang gửi…" : "Duyệt & Gửi cho phụ huynh"}
          </Button>
        ) : null}
        <Link
          href="/teacher/parent-cards"
          className="inline-flex h-10 items-center rounded-xl border border-border/80 bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted/70 transition-colors shadow-2xs"
        >
          Quản lý thẻ & phản hồi
        </Link>
      </CardFooter>
    </Card>
  );
}
