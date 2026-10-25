"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";

export interface MemoryItem {
  id: string;
  content: string;
}

/** Trí nhớ dài hạn: những điều StuGuide nhớ về cô và lớp, áp dụng cho mọi cuộc trò chuyện. Cô xem, thêm, xóa. */
export function MemoryPanel({ items }: { items: MemoryItem[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    const content = text.trim();
    if (content.length < 3) return;
    try {
      await api("/api/memory", { method: "POST", body: { content } });
      setText("");
      setError(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Chưa lưu được");
    }
  };

  const forget = async (id: string) => {
    await api(`/api/memory/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <Card className="border-purple-100 bg-white shadow-2xs">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-2xs">
            <Brain className="size-3.5" aria-hidden />
          </span>
          Trí nhớ về lớp của cô
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        <ul className="space-y-1.5">
          {items.map((m) => (
            <li
              key={m.id}
              className="flex items-start gap-2 rounded-xl bg-purple-50/70 border border-purple-100/60 px-3 py-2 text-xs font-medium text-purple-950"
            >
              <span className="flex-1">{m.content}</span>
              <button
                type="button"
                aria-label={`Quên: ${m.content}`}
                onClick={() => forget(m.id)}
                className="mt-0.5 text-purple-400 hover:text-rose-600 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-xs text-muted-foreground leading-relaxed">
              Chưa lưu ghi chú nào. Cô cứ trò chuyện tự nhiên, StuGuide sẽ tự động ghi nhớ các thói quen của lớp.
            </li>
          )}
        </ul>
        <form
          className="flex gap-1.5 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Thêm đặc điểm lớp…"
            aria-label="Thêm điều cần nhớ"
            className="h-8 text-xs bg-slate-50 focus:bg-white"
          />
          <Button type="submit" size="sm" variant="ai" className="h-8 px-2.5 text-xs font-bold shrink-0">
            <Plus className="size-3.5" /> Thêm
          </Button>
        </form>
        {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
      </CardContent>
    </Card>
  );
}
