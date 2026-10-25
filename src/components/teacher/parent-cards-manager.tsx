"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, ExternalLink, Pencil, Radio, Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Tabs } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api-client";
import { useLiveFeedback } from "@/hooks/use-live-feedback";
import type { FeedbackStats } from "@/services/types";
import type { ParentCardContent } from "@/core/schemas/parent-card.schema";

export interface ManagerProps {
  card: { id: string; status: string; content: ParentCardContent; gameName: string | null } | null;
  stats: FeedbackStats | null;
  links: { studentName: string; url: string }[];
  candidatePlanId: string | null;
}

type Filter = "completed" | "support" | "pending";

/** Màn hình 6 – duyệt thẻ AI soạn, gửi, theo dõi phản hồi realtime. */
export function ParentCardsManager({ card: initialCard, stats: initialStats, links: initialLinks, candidatePlanId }: ManagerProps) {
  const [card, setCard] = useState(initialCard);
  const [links, setLinks] = useState(initialLinks);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ParentCardContent | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<Filter>("completed");

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setBusy(null);
    }
  };

  if (!card) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CardContent className="space-y-3 p-8">
          <Sparkles className="mx-auto size-10 text-lilac-strong" aria-hidden />
          <h2 className="text-lg font-bold">Chưa có thẻ nhiệm vụ nào</h2>
          <p className="text-muted-foreground">Thẻ được AI tóm tắt từ giáo án đã phê duyệt.</p>
          {error && <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral-strong">{error}</p>}
          {candidatePlanId ? (
            <Button
              disabled={busy !== null}
              onClick={() =>
                run("gen", async () => {
                  await api("/api/cards", { method: "POST", body: { planId: candidatePlanId } });
                  window.location.reload();
                })
              }
            >
              <Sparkles /> {busy === "gen" ? "AI đang soạn…" : "Soạn thẻ từ giáo án đã duyệt gần nhất"}
            </Button>
          ) : (
            <Link href="/teacher" className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Về trợ lý chat để soạn giáo án</Link>
          )}
        </CardContent>
      </Card>
    );
  }

  const sent = card.status === "sent";
  const content = card.content;

  const saveEdit = () =>
    run("save", async () => {
      if (!draft) return;
      const res = await api<{ card: { content: ParentCardContent } }>(`/api/cards/${card.id}`, { method: "PATCH", body: { content: draft } });
      setCard({ ...card, content: res.card.content });
      setEditing(false);
    });

  const send = () =>
    run("send", async () => {
      const res = await api<{ links: { studentName: string; url: string }[] }>(`/api/cards/${card.id}/send`, { method: "POST", body: {} });
      setLinks(res.links);
      setCard({ ...card, status: "sent" });
      window.location.reload();
    });

  const copyAll = async () => {
    const text = [
      content.greeting,
      content.classSummary,
      `${content.missionTitle} (${content.duration} phút):`,
      ...content.eqQuestions.map((q, i) => `${i + 1}. ${q}`),
      content.adultRole,
      ...(links.length ? ["", "Link riêng từng bé:", ...links.map((l) => `${l.studentName}: ${location.origin}${l.url}`)] : []),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <div className="mb-1 flex gap-2">
              <Badge tone="ai"><Sparkles aria-hidden /> AI tóm tắt</Badge>
              <Badge tone={sent ? "info" : "neutral"}>{sent ? "Đã gửi" : "Bản nháp"}</Badge>
            </div>
            <CardTitle className="text-lg">Thẻ nhiệm vụ {content.duration} phút · {card.gameName}</CardTitle>
          </div>
          {!sent && !editing && (
            <Button size="sm" variant="outline" onClick={() => { setDraft(content); setEditing(true); }}><Pencil /> Sửa nội dung</Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {editing && draft ? (
            <div className="space-y-3">
              <Textarea rows={2} value={draft.greeting} onChange={(e) => setDraft({ ...draft, greeting: e.target.value })} aria-label="Lời chào" />
              <Textarea rows={3} value={draft.classSummary} onChange={(e) => setDraft({ ...draft, classSummary: e.target.value })} aria-label="Tóm tắt hôm nay" />
              <Input value={draft.missionTitle} onChange={(e) => setDraft({ ...draft, missionTitle: e.target.value })} aria-label="Tên nhiệm vụ" />
              <Textarea rows={3} value={draft.eqQuestions.join("\n")} onChange={(e) => setDraft({ ...draft, eqQuestions: e.target.value.split("\n").filter(Boolean) })} aria-label="Câu hỏi EQ" />
              <Textarea rows={2} value={draft.adultRole} onChange={(e) => setDraft({ ...draft, adultRole: e.target.value })} aria-label="Vai trò của bố mẹ" />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={busy !== null}>Lưu</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Hủy</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground">{content.greeting}</p>
              <p className="leading-relaxed">{content.classSummary}</p>
              <div className="rounded-2xl bg-lilac-soft p-4">
                <p className="mb-2 font-bold text-lilac-strong">{content.missionTitle}</p>
                <ul className="list-inside list-decimal space-y-1.5">{content.eqQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
                <p className="mt-3 text-lilac-strong">{content.adultRole}</p>
              </div>
            </>
          )}
          {error && <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 font-medium text-coral-strong">{error}</p>}
        </CardContent>
        <CardFooter>
          {!sent && <Button onClick={send} disabled={busy !== null || editing}><Send /> {busy === "send" ? "Đang gửi…" : "Duyệt & Gửi Zalo/Web"}</Button>}
          <Button variant="outline" onClick={copyAll}>{copied ? <Check /> : <Copy />} {copied ? "Đã sao chép" : "Sao chép nội dung & link nhóm lớp"}</Button>
        </CardFooter>
      </Card>

      {initialStats && sent ? <FeedbackPanel cardId={card.id} initial={initialStats} filter={filter} onFilter={setFilter} links={links} /> : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Sau khi gửi, tỷ lệ phụ huynh hoàn thành sẽ cập nhật <b className="text-foreground">trực tiếp</b> tại đây — không cần tải lại trang.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FeedbackPanel({ cardId, initial, filter, onFilter, links }: { cardId: string; initial: FeedbackStats; filter: Filter; onFilter: (f: Filter) => void; links: { studentName: string; url: string }[] }) {
  const { stats, live } = useLiveFeedback(cardId, initial);
  const names = filter === "completed" ? stats.completedStudents : filter === "support" ? stats.needsSupportStudents : stats.pendingStudents;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Phản hồi phụ huynh</CardTitle>
          <Badge tone={live ? "success" : "neutral"}><Radio aria-hidden /> {live ? "Trực tiếp" : "Đã tải"}</Badge>
        </CardHeader>
        <CardContent className="flex items-center gap-5">
          <ProgressRing value={stats.completionRate} label="hoàn thành" />
          <p className="text-sm text-muted-foreground"><b className="text-xl text-foreground tabular-nums">{stats.completed}/{stats.total}</b><br />phụ huynh đã cùng con hoàn thành</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4">
          <Tabs<Filter> value={filter} onChange={onFilter} className="w-full" items={[
            { value: "completed", label: `Xong (${stats.completed})` },
            { value: "support", label: `Cần hỗ trợ (${stats.needsPractice})` },
            { value: "pending", label: `Chưa (${stats.pending})` },
          ]} />
          <ul className="min-h-16 space-y-1 text-sm">
            {names.length === 0 && <li className="py-3 text-center text-muted-foreground">Chưa có bé nào</li>}
            {names.map((n) => (
              <li key={n} className="flex items-center justify-between rounded-xl px-2.5 py-1.5 hover:bg-muted">
                {n}
                {links.find((l) => l.studentName === n) && (
                  <Link href={links.find((l) => l.studentName === n)!.url} target="_blank" aria-label={`Xem thẻ của ${n} như phụ huynh`} className="text-muted-foreground hover:text-foreground"><ExternalLink className="size-4" /></Link>
                )}
              </li>
            ))}
          </ul>
          {filter === "support" && stats.needsPractice > 0 && <p className="text-xs text-muted-foreground">Cô lưu ý các bé này vào sáng mai nhé.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
