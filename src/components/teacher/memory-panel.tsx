"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
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
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900">Trí nhớ về lớp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        <ul className="space-y-1.5">
          {items.map((m) => (
            <li
              key={m.id}
              className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700"
            >
              <span className="flex-1">{m.content}</span>
              <button
                type="button"
                aria-label={`Quên: ${m.content}`}
                onClick={() => forget(m.id)}
                className="mt-0.5 text-slate-400 transition-colors hover:text-rose-600"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-xs text-muted-foreground leading-relaxed">
              Chưa có ghi chú. StuGuide sẽ tự ghi nhớ khi cô trò chuyện.
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
          <Button type="submit" size="sm" variant="outline" className="h-8 shrink-0 px-2.5 text-xs">
            Thêm
          </Button>
        </form>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
