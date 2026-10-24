"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearDraft, loadDraft, useAutoSave } from "@/hooks/use-auto-save";

const DRAFT_KEY = "sg:chat-draft";

export function Composer({ onSend, busy, placeholder }: { onSend: (text: string) => void; busy: boolean; placeholder?: string }) {
  const [text, setText] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Khôi phục bản nháp từ localStorage sau khi hydrate (nguồn ngoài React, không thể đọc lúc SSR)
    const draft = loadDraft<string>(DRAFT_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (draft) setText(draft);
    setHydrated(true);
  }, []);
  useAutoSave(DRAFT_KEY, text, { enabled: hydrated && text.length > 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const submit = () => {
    const value = text.trim();
    if (!value || busy) return;
    onSend(value);
    setText("");
    clearDraft(DRAFT_KEY);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-soft focus-within:border-primary"
    >
      <textarea
        ref={ref}
        value={text}
        rows={1}
        disabled={busy}
        aria-label="Nhắn cho Mầm Học AI"
        placeholder={placeholder ?? "Nhắn cho Mầm Học AI… ví dụ: Soạn trò chơi cho lớp 4–5 tuổi với hộp sữa và rổ nhựa"}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
      />
      <Button type="submit" size="icon" aria-label="Gửi" disabled={busy || !text.trim()}>
        <Send />
      </Button>
    </form>
  );
}
