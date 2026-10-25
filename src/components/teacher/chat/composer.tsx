"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearDraft, loadDraft, useAutoSave } from "@/hooks/use-auto-save";

const DRAFT_KEY = "sg:chat-draft";

export function Composer({
  onSend,
  busy,
  placeholder,
}: {
  onSend: (text: string) => void;
  busy: boolean;
  placeholder?: string;
}) {
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
      className="flex items-end gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-soft focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 transition-all duration-200"
    >
      <textarea
        ref={ref}
        value={text}
        rows={1}
        disabled={busy}
        aria-label="Nhắn cho Mầm Học AI – StuGuide"
        placeholder={placeholder ?? "Nhắn cho StuGuide AI… ví dụ: Soạn trò chơi cho lớp 4–5 tuổi với bóng và rổ nhựa 🧸"}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 disabled:opacity-60 text-slate-800 font-medium"
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Gửi"
        disabled={busy || !text.trim()}
        className="size-9.5 rounded-2xl shadow-colorful font-bold transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-primary to-blue-600 text-white"
      >
        <Send className="size-4" />
      </Button>
    </form>
  );
}
