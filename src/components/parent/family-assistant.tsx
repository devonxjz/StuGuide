"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertCircle, Bot, DatabaseZap, RotateCcw, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardRenderer } from "@/components/teacher/chat/cards/card-renderer";
import { DeviceQuotaBadge } from "@/components/shared/device-quota-badge";
import { useDeviceQuota } from "@/hooks/use-device-quota";
import { quotaAwareFetch } from "@/lib/device-quota";
import { api, ApiError } from "@/lib/api-client";
import { userMessage } from "@/lib/api-error";
import { MarkdownText } from "@/components/shared/markdown-text";
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
  const { quota, refresh: refreshQuota } = useDeviceQuota();

  const transport = useMemo(
    () =>
      new DefaultChatTransport<StuGuideMessage>({
        api: "/api/family/chat",
        fetch: quotaAwareFetch,
        // Client gửi cửa sổ hội thoại đang giữ trong RAM; server không có lịch sử riêng
        prepareSendMessagesRequest: ({ messages }) => ({ body: { studentId, turns: messagesToTurns(messages) } }),
      }),
    [studentId],
  );
  const { messages, sendMessage, regenerate, status } = useChat<StuGuideMessage>({
    transport,
    onFinish: () => {
      void refreshQuota();
    },
    onError: (err) => {
      void refreshQuota();
      // hết lượt, bấm quá nhanh… hiện đúng lời server; lỗi hệ thống/mạng hiện câu chung
      setError(userMessage(err, "Hệ thống AI đang bận, bố mẹ thử gửi lại giúp mình nhé."));
    },
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
    if (quota.isExceeded) {
      setError("Quá hạn sử dụng, bạn phải mua thêm lượt");
      return;
    }
    setError(null);
    store?.record("message", { role: "parent", length: value.length });
    void sendMessage({ text: value });
    setInput("");
  };

  const suggestTonight = async () => {
    if (quota.isExceeded) {
      setError("Quá hạn sử dụng, bạn phải mua thêm lượt");
      return;
    }
    setBusyTonight(true);
    setError(null);
    try {
      const res = await api<{ activity: HomeActivity }>("/api/family/activity", { method: "POST", body: { studentId } });
      setTonight(res.activity);
      store?.record("view", { what: "tonight-activity", title: res.activity.title });
      void refreshQuota();
    } catch (e) {
      void refreshQuota();
      setError(e instanceof ApiError ? e.message : "Chưa soạn được, bố mẹ thử lại nhé.");
    } finally {
      setBusyTonight(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Bot className="size-5 text-lilac-strong" aria-hidden /> Trợ lý gia đình của {childName}</CardTitle>
        <div className="flex items-center gap-2">
          <DeviceQuotaBadge quota={quota} />
          <Button size="sm" variant="ai" disabled={busyTonight || busy || quota.isExceeded} onClick={suggestTonight}>
            <Sparkles /> {busyTonight ? "Đang soạn…" : "Gợi ý tối nay cho con"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="scroll-thin max-h-[32rem] min-h-40 space-y-4 overflow-y-auto pr-1" aria-live="polite">
          {messages.length === 0 && !tonight && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Bố mẹ cứ hỏi tự nhiên. Mình biết {childName} thích gì và đang học gì ở lớp nên gợi ý sẽ riêng cho bé.</p>
              <div className="flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={busy || quota.isExceeded}
                    onClick={() => send(q)}
                    className="min-h-11 rounded-full border bg-card px-4 text-sm hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("space-y-3", m.role === "user" && "flex justify-end")}>
              {m.parts.map((p, i) =>
                p.type === "text" ? (
                  !p.text.trim() ? null : m.role === "user" ? (
                    <p key={i} className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-primary text-primary-foreground">{p.text}</p>
                  ) : (
                    <MarkdownText key={i} text={p.text} className="max-w-[85%] rounded-2xl bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-slate-700" />
                  )
                ) : p.type === "data-card" ? (
                  <CardRenderer key={i} data={p.data} />
                ) : null,
              )}
            </div>
          ))}
          {tonight && <CardRenderer data={{ kind: "home-activity", studentId, activity: tonight }} />}
          {busy && <p className="text-sm text-muted-foreground">Mình đang soạn cho {childName}…</p>}
          {error && (
            <p
              role="alert"
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
                error.includes("Quá hạn")
                  ? "border border-rose-200 bg-rose-50 text-rose-800"
                  : "bg-sun-soft text-sun-strong",
              )}
            >
              {error.includes("Quá hạn") && <AlertCircle className="size-4 shrink-0 text-rose-600" aria-hidden />}
              {error}
              {!error.includes("Quá hạn") && (
                <Button size="sm" variant="sun" onClick={() => void regenerate()}>
                  <RotateCcw /> Gửi lại
                </Button>
              )}
            </p>
          )}
          <div ref={bottom} />
        </div>

        {quota.isExceeded && (
          <div role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 animate-pop-in">
            <AlertCircle className="size-4 shrink-0 text-rose-600" aria-hidden />
            <span className="font-bold">Quá hạn sử dụng, bạn phải mua thêm lượt</span>
          </div>
        )}

        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <textarea
            value={input}
            rows={2}
            disabled={busy || quota.isExceeded}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }}
            aria-label="Nhắn cho trợ lý gia đình"
            placeholder={quota.isExceeded ? "Quá hạn sử dụng, bạn phải mua thêm lượt" : `Hỏi về ${childName}, hoặc kể về bé để mình nhớ…`}
            className="min-h-12 flex-1 resize-none rounded-2xl border bg-card px-4 py-3 text-base placeholder:text-muted-foreground/70 focus-visible:border-primary disabled:opacity-60"
          />
          <Button type="submit" size="lg" aria-label="Gửi" disabled={busy || quota.isExceeded || !input.trim()}><Send /></Button>
        </form>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <DatabaseZap className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Cuộc trò chuyện này đang lưu tạm trong bộ nhớ của máy. Khi bố mẹ đóng hoặc rời trang, mình mới ghi lại những điều đáng nhớ về {childName}.
        </p>
      </CardContent>
    </Card>
  );
}
