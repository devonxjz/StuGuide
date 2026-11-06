"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { EMAIL_BODY_MAX, EMAIL_SUBJECT_MAX, type EmailSendResult, type ParentEmailDraft } from "@/core/schemas/parent-email.schema";
import type { CardData } from "@/types/chat";

const KIND_BADGE = {
  good: { label: "Làm tốt", tone: "success" },
  concern: { label: "Cần quan tâm", tone: "warning" },
  none: { label: "Cập nhật chung", tone: "neutral" },
} as const;

const STATUS_BADGE = {
  sent: { label: "Đã gửi", tone: "success" },
  duplicate: { label: "Đã gửi trước đó", tone: "info" },
  no_email: { label: "Chưa có email", tone: "warning" },
  failed: { label: "Không gửi được", tone: "danger" },
} as const;

const hasEmail = (d: ParentEmailDraft) => d.recipients.some((r) => r.email);

/** Thư soạn sẵn cho phụ huynh: cô xem, sửa, chọn người nhận rồi bấm Gửi (trợ lý không tự gửi). */
export function ParentEmailsCard({ data }: { data: Extract<CardData, { kind: "parent-emails" }> }) {
  const [drafts, setDrafts] = useState(data.drafts);
  const [selected, setSelected] = useState(() => new Set(data.drafts.filter(hasEmail).map((d) => d.studentId)));
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Map<string, EmailSendResult> | null>(null);

  const edit = (studentId: string, patch: Partial<Pick<ParentEmailDraft, "subject" | "body">>) =>
    setDrafts((list) => list.map((d) => (d.studentId === studentId ? { ...d, ...patch } : d)));

  const toggle = (studentId: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (!next.delete(studentId)) next.add(studentId);
      return next;
    });

  const chosen = drafts.filter((d) => selected.has(d.studentId) && hasEmail(d));
  const sentAll = results !== null && chosen.every((d) => results.get(d.studentId)?.status === "sent" || results.get(d.studentId)?.status === "duplicate");

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ results: EmailSendResult[] }>("/api/parent-emails/send", {
        method: "POST",
        body: { ...(data.planId ? { planId: data.planId } : {}), emails: chosen.map((d) => ({ studentId: d.studentId, subject: d.subject, body: d.body })) },
      });
      setResults(new Map(res.results.map((r) => [r.studentId, r])));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Có lỗi xảy ra, cô thử lại nhé");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-[44rem] animate-pop-in">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">Email cho phụ huynh</Badge>
          <Badge tone="neutral">{drafts.length} thư</Badge>
          {data.lessonTitle && <span className="truncate text-xs text-slate-500">Bài: {data.lessonTitle}</span>}
        </div>
        <CardTitle className="mt-1 text-base">Cô xem lại rồi bấm Gửi</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        {!data.mailerReady && (
          <p role="alert" className="rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-700">
            Hệ thống chưa cấu hình email gửi đi (SMTP) nên chưa thể gửi. Cô vẫn xem và chỉnh thư được.
          </p>
        )}
        {results === null && (
          <p role="status" className="rounded-xl bg-slate-50 px-3.5 py-2 text-xs text-slate-600">
            Trợ lý không tự gửi thư. Thư chỉ đi tới phụ huynh khi cô bấm “Gửi”.
          </p>
        )}

        <ul className="divide-y rounded-xl border">
          {drafts.map((d) => {
            const result = results?.get(d.studentId);
            const kind = KIND_BADGE[d.kind];
            const expanded = open === d.studentId;
            const emails = d.recipients.filter((r) => r.email).map((r) => r.email);
            return (
              <li key={d.studentId} className="p-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--accent)]"
                    checked={selected.has(d.studentId) && hasEmail(d)}
                    disabled={!hasEmail(d) || busy || results !== null}
                    onChange={() => toggle(d.studentId)}
                    aria-label={`Gửi thư cho phụ huynh bé ${d.studentName}`}
                  />
                  <button type="button" onClick={() => setOpen(expanded ? null : d.studentId)} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{d.studentName}</span>
                        <Badge tone={kind.tone}>{kind.label}</Badge>
                        {result && <Badge tone={STATUS_BADGE[result.status].tone}>{STATUS_BADGE[result.status].label}</Badge>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {emails.length ? emails.join(", ") : "Chưa có email phụ huynh · nhập ở Danh bạ phụ huynh"}
                      </span>
                    </span>
                    <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", expanded && "rotate-180")} aria-hidden />
                  </button>
                </div>
                {result?.error && <p className="mt-2 pl-7 text-xs text-coral-strong">{result.error}</p>}
                {expanded && (
                  <div className="mt-3 space-y-2 pl-7">
                    <Input
                      value={d.subject}
                      onChange={(e) => edit(d.studentId, { subject: e.target.value.replace(/[\r\n]+/g, " ") })}
                      maxLength={EMAIL_SUBJECT_MAX}
                      disabled={results !== null}
                      aria-label={`Tiêu đề thư cho bé ${d.studentName}`}
                    />
                    <Textarea
                      value={d.body}
                      onChange={(e) => edit(d.studentId, { body: e.target.value })}
                      rows={9}
                      maxLength={EMAIL_BODY_MAX}
                      disabled={results !== null}
                      aria-label={`Nội dung thư cho bé ${d.studentName}`}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {error && (
          <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral-strong">
            {error}
          </p>
        )}
      </CardContent>

      <CardFooter>
        {results === null || !sentAll ? (
          <Button onClick={send} disabled={busy || chosen.length === 0 || !data.mailerReady || results !== null}>
            <Send /> {busy ? "Đang gửi…" : `Gửi ${chosen.length} thư`}
          </Button>
        ) : (
          <p role="status" className="text-sm font-medium text-emerald-700">
            Đã gửi xong cho phụ huynh.
          </p>
        )}
        <Link href="/teacher/contacts" className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
          Danh bạ phụ huynh
        </Link>
      </CardFooter>
    </Card>
  );
}
