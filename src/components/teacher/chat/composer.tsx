"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
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
    <div className="ai-border rounded-2xl" data-active={busy}>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] focus-within:border-transparent transition-colors duration-200"
    >
      <textarea
        ref={ref}
        value={text}
        rows={1}
        disabled={busy}
        aria-label="Nhắn cho StuGuide"
        placeholder={placeholder ?? "Nhắn cho StuGuide… ví dụ: Soạn trò chơi cho lớp 4–5 tuổi với bóng và rổ nhựa"}
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
        className="size-9 rounded-xl bg-slate-900 text-white shadow-none hover:bg-slate-800 hover:translate-y-0 bg-none"
      >
        <ArrowUp className="size-4" />
      </Button>
    </form>
    </div>
  );
}
