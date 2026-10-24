"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";

export interface MemoryItem {
  id: string;
  content: string;
}

/** Trí nhớ dài hạn: những điều Mầm Học AI nhớ về cô và lớp, áp dụng cho mọi cuộc trò chuyện. Cô xem, thêm, xóa. */
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-4 text-lilac-strong" aria-hidden /> Mầm Học AI nhớ về cô
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-1.5">
          {items.map((m) => (
            <li key={m.id} className="flex items-start gap-2 rounded-xl bg-lilac-soft/60 px-3 py-2 text-sm">
              <span className="flex-1">{m.content}</span>
              <button type="button" aria-label={`Quên: ${m.content}`} onClick={() => forget(m.id)} className="mt-0.5 text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-muted-foreground">Chưa nhớ gì. Cô cứ kể về lớp, mình sẽ tự ghi nhớ những điều quan trọng.</li>}
        </ul>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void add(); }}>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Thêm điều cần nhớ…" aria-label="Thêm điều cần nhớ" className="h-9" />
          <Button type="submit" size="icon" variant="outline" aria-label="Thêm"><Plus /></Button>
        </form>
        {error && <p role="alert" className="text-xs font-medium text-coral-strong">{error}</p>}
      </CardContent>
    </Card>
  );
}
