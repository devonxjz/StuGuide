"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, DatabaseZap, RotateCcw, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardRenderer } from "@/components/teacher/chat/cards/card-renderer";
import { api, ApiError } from "@/lib/api-client";
import { messagesToTurns } from "@/lib/message-text";
import { cn } from "@/lib/utils";
import type { HomeActivity } from "@/core/schemas/family.schema";
import type { StuGuideMessage } from "@/types/chat";
import { useShortTerm } from "./short-term-context";

const QUICK = ["Tối nay chơi gì với con?", "Con đang học gì ở lớp?", "Con tiến bộ thế nào rồi?", "Nhà mình có hộp giấy và tất, chơi gì được?"];

/**
 * Trợ lý gia đình: phụ huynh dẫn dắt. Hội thoại nằm trong RAM của tab (useChat + ShortTermStore);
 * server không lưu từng lượt, chỉ nhận một lần khi tab ẩn/đóng.
 */
export function FamilyAssistant({ studentId, childName }: { studentId: string; childName: string }) {
  const store = useShortTerm();
  const [input, setInput] = useState("");
  const [tonight, setTonight] = useState<HomeActivity | null>(null);
  const [busyTonight, setBusyTonight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<StuGuideMessage>({
        api: "/api/family/chat",
        // Client gửi cửa sổ hội thoại đang giữ trong RAM; server không có lịch sử riêng
        prepareSendMessagesRequest: ({ messages }) => ({ body: { studentId, turns: messagesToTurns(messages) } }),
      }),
    [studentId],
  );
  const { messages, sendMessage, regenerate, status } = useChat<StuGuideMessage>({
    transport,
    onError: () => setError("Hệ thống AI đang bận, bố mẹ thử gửi lại giúp mình nhé."),
  });
  const busy = status === "submitted" || status === "streaming";

  // đồng bộ hội thoại vào bộ nhớ ngắn hạn (chỉ RAM)
  useEffect(() => {
    store?.setTranscript(messagesToTurns(messages));
  }, [messages, store]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, tonight]);

  const send = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setError(null);
    store?.record("message", { role: "parent", length: value.length });
    void sendMessage({ text: value });
    setInput("");
  };

  const suggestTonight = async () => {
    setBusyTonight(true);
    setError(null);
    try {
      const res = await api<{ activity: HomeActivity }>("/api/family/activity", { method: "POST", body: { studentId } });
      setTonight(res.activity);
      store?.record("view", { what: "tonight-activity", title: res.activity.title });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Chưa soạn được, bố mẹ thử lại nhé.");
    } finally {
      setBusyTonight(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Bot className="size-5 text-lilac-strong" aria-hidden /> Trợ lý gia đình của {childName}</CardTitle>
        <Button size="sm" variant="ai" disabled={busyTonight || busy} onClick={suggestTonight}>
          <Sparkles /> {busyTonight ? "Đang soạn…" : "Gợi ý tối nay cho con"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="scroll-thin max-h-[32rem] min-h-40 space-y-4 overflow-y-auto pr-1" aria-live="polite">
          {messages.length === 0 && !tonight && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Bố mẹ cứ hỏi tự nhiên. Mình biết {childName} thích gì và đang học gì ở lớp nên gợi ý sẽ riêng cho bé.</p>
              <div className="flex flex-wrap gap-2">{QUICK.map((q) => <button key={q} type="button" onClick={() => send(q)} className="min-h-11 rounded-full border bg-card px-4 text-sm hover:border-primary">{q}</button>)}</div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("space-y-3", m.role === "user" && "flex justify-end")}>
              {m.parts.map((p, i) =>
                p.type === "text" ? (
                  p.text.trim() ? <p key={i} className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap", m.role === "user" ? "bg-primary text-primary-foreground" : "border bg-card")}>{p.text}</p> : null
                ) : p.type === "data-card" ? (
                  <CardRenderer key={i} data={p.data} />
                ) : null,
              )}
            </div>
          ))}
          {tonight && <CardRenderer data={{ kind: "home-activity", studentId, activity: tonight }} />}
          {busy && <p className="text-sm text-muted-foreground">Mình đang soạn cho {childName}…</p>}
          {error && (
            <p role="alert" className="flex flex-wrap items-center gap-2 rounded-xl bg-sun-soft px-3 py-2 text-sm font-medium text-sun-strong">
              {error} <Button size="sm" variant="sun" onClick={() => void regenerate()}><RotateCcw /> Gửi lại</Button>
            </p>
          )}
          <div ref={bottom} />
        </div>

        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <textarea
            value={input}
            rows={2}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }}
            aria-label="Nhắn cho trợ lý gia đình"
            placeholder={`Hỏi về ${childName}, hoặc kể về bé để mình nhớ…`}
            className="min-h-12 flex-1 resize-none rounded-2xl border bg-card px-4 py-3 text-base placeholder:text-muted-foreground/70 focus-visible:border-primary disabled:opacity-60"
          />
          <Button type="submit" size="lg" aria-label="Gửi" disabled={busy || !input.trim()}><Send /></Button>
        </form>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <DatabaseZap className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Cuộc trò chuyện này đang lưu tạm trong bộ nhớ của máy. Khi bố mẹ đóng hoặc rời trang, mình mới ghi lại những điều đáng nhớ về {childName}.
        </p>
      </CardContent>
    </Card>
  );
}
