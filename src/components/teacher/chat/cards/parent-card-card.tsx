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
    <Card className="max-w-[44rem] animate-pop-in">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge tone="ai">
            <Smartphone aria-hidden /> Thẻ nhiệm vụ {data.content.duration} phút
          </Badge>
          <Badge tone={status === "sent" ? "info" : "neutral"}>{status === "sent" ? "Đã gửi" : "Bản nháp"}</Badge>
        </div>
        <CardTitle>{data.content.missionTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">{data.content.greeting}</p>
        <p>{data.content.classSummary}</p>
        <ul className="list-inside list-disc space-y-1 rounded-xl bg-primary-soft/60 p-3 font-medium">
          {data.content.eqQuestions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
        {data.awaiting === "send" && status !== "sent" && (
          <p role="status" className="rounded-xl bg-primary-soft px-3 py-2 font-medium text-primary-strong">
            Trợ lý không tự gửi cho phụ huynh. Cô đọc lại rồi bấm “Duyệt & Gửi cho phụ huynh” để xác nhận.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 font-medium text-coral-strong">
            {error}
          </p>
        )}
      </CardContent>
      <CardFooter>
        {status !== "sent" ? (
          <Button onClick={send} disabled={busy}>
            <Send /> {busy ? "Đang gửi…" : "Duyệt & Gửi cho phụ huynh"}
          </Button>
        ) : null}
        <Link href="/teacher/parent-cards" className="inline-flex h-10 items-center rounded-xl border bg-card px-4 text-sm font-semibold hover:bg-muted">
          Quản lý thẻ & phản hồi
        </Link>
      </CardFooter>
    </Card>
  );
}
