"use client";

import { useState } from "react";
import { Home, Lightbulb, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CardData } from "@/types/chat";
import { useShortTerm } from "../short-term-context";

const REACTIONS = [
  { emoji: "😀", label: "Bé rất thích" },
  { emoji: "🙂", label: "Bé thấy vui" },
  { emoji: "😐", label: "Bé chưa hứng" },
] as const;

/** Hoạt động 5 phút cá nhân hóa cho bé. Phụ huynh dẫn dắt; mọi thao tác chỉ ghi vào RAM cho tới khi đóng tab. */
export function HomeActivityCard({ data }: { data: Extract<CardData, { kind: "home-activity" }> }) {
  const store = useShortTerm();
  const { activity } = data;
  const [done, setDone] = useState<Set<number>>(new Set());
  const [reaction, setReaction] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState(false);

  const toggle = (i: number) => {
    const next = new Set(done);
    const on = !next.delete(i) && !!next.add(i);
    setDone(next);
    store?.record("activity-step", { step: i + 1, done: on, title: activity.title });
  };

  return (
    <Card className="max-w-[44rem] animate-pop-in bg-white border-blue-200/80 shadow-soft">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge tone="ai"><Sparkles aria-hidden /> Dành riêng cho bé</Badge>
          <Badge tone="success"><Home aria-hidden /> {activity.minutes} phút · đồ vật trong nhà</Badge>
        </div>
        <CardTitle className="text-lg">{activity.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{activity.whyForThisChild}</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="mb-1 font-semibold">Cần chuẩn bị</p>
          <ul className="list-inside list-disc space-y-0.5">{activity.materials.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
        <div>
          <p className="mb-1.5 font-semibold">Bố mẹ cùng chơi với con</p>
          <ul className="space-y-1.5">
            {activity.steps.map((s, i) => (
              <li key={s}>
                <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors", done.has(i) ? "border-primary bg-primary-soft" : "bg-card hover:bg-muted")}>
                  <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} aria-label={s} className="mt-0.5 size-5 accent-[var(--primary)]" />
                  <span className={cn(done.has(i) && "line-through opacity-70")}>{i + 1}. {s}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <p className="rounded-xl bg-lilac-soft p-3 text-lilac-strong"><b>Hỏi con:</b> {activity.eqQuestion}</p>
        <p className="flex gap-2 text-muted-foreground"><Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden /> {activity.parentTip}</p>

        <div className="space-y-2 border-t pt-3">
          <p className="font-semibold">Bé phản ứng thế nào?</p>
          <div className="flex flex-wrap gap-2">
            {REACTIONS.map((r) => (
              <button
                key={r.label}
                type="button"
                aria-pressed={reaction === r.emoji}
                onClick={() => {
                  setReaction(r.emoji);
                  store?.record("reaction", { emoji: r.emoji, label: r.label, title: activity.title });
                }}
                className={cn("min-h-11 rounded-xl border px-3.5 text-sm font-medium", reaction === r.emoji ? "border-primary bg-primary-soft text-primary-strong" : "bg-card hover:bg-muted")}
              >
                {r.emoji} {r.label}
              </button>
            ))}
          </div>
          <Textarea value={note} onChange={(e) => { setNote(e.target.value); setSavedNote(false); }} aria-label="Bé phản ứng thế nào? Ghi chú cho lần sau" placeholder="Bé thích gì, ngại gì? Mình sẽ nhớ cho lần sau…" className="min-h-16" maxLength={500} />
          <Button
            size="sm"
            variant="soft"
            disabled={!note.trim() || savedNote}
            onClick={() => {
              store?.record("note", { text: note.trim(), title: activity.title });
              setSavedNote(true);
            }}
          >
            {savedNote ? "Đã ghi tạm ✓" : "Lưu ghi chú"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
