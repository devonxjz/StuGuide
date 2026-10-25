"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Plus, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, ApiError } from "@/lib/api-client";

export interface ChildMemoryItem {
  id: string;
  content: string;
  source: "parent" | "ai-session" | "teacher";
}

const SOURCE = { parent: "Bố mẹ kể", "ai-session": "Mình ghi nhận", teacher: "Cô giáo" } as const;

/** Những điều Mầm Học AI nhớ về bé để cá nhân hóa. Phụ huynh xem, thêm và xóa bất kỳ lúc nào. */
export function ChildMemoryPanel({ studentId, childName, items, sharedWithTeacher = false }: { studentId: string; childName: string; items: ChildMemoryItem[]; sharedWithTeacher?: boolean }) {
  const router = useRouter();
  const [shared, setShared] = useState(sharedWithTeacher);
  const [savingShare, setSavingShare] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (text.trim().length < 3) return;
    try {
      await api("/api/family/memory", { method: "POST", body: { studentId, content: text.trim() } });
      setText("");
      setError(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Chưa lưu được");
    }
  };
  const toggleShare = async (next: boolean) => {
    setSavingShare(true);
    setError(null);
    try {
      await api("/api/family/sharing", { method: "POST", body: { studentId, shared: next } });
      setShared(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Chưa cập nhật được");
    } finally {
      setSavingShare(false);
    }
  };
  const forget = async (id: string) => {
    await api(`/api/family/memory/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Brain className="size-4 text-lilac-strong" aria-hidden /> Mình nhớ gì về {childName}</CardTitle>
        <p className="text-xs text-muted-foreground">Dùng để gợi ý riêng cho bé. Bố mẹ có thể xóa bất kỳ mục nào.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Chia sẻ với cô giáo</p>
            <p className="text-xs text-muted-foreground">
              {shared ? "Cô giáo xem được các mục dưới đây để thiết kế hoạt động riêng cho bé. Cô không thấy nội dung trò chuyện của bố mẹ. Bố mẹ có thể tắt bất cứ lúc nào." : "Đang tắt: cô giáo không xem được hồ sơ này. Bật nếu bố mẹ muốn cô cá nhân hóa hoạt động ở lớp cho bé."}
            </p>
          </div>
          <Switch checked={shared} onCheckedChange={(v) => !savingShare && void toggleShare(v)} label={`Chia sẻ hồ sơ của ${childName} với cô giáo`} />
        </div>
        <ul className="space-y-1.5">
          {items.map((m) => (
            <li key={m.id} className="flex items-start gap-2 rounded-xl bg-lilac-soft/60 px-3 py-2 text-sm">
              <span className="flex-1">{m.content} <Badge tone="neutral" className="ml-1 align-middle">{SOURCE[m.source]}</Badge></span>
              <button type="button" aria-label={`Quên: ${m.content}`} onClick={() => forget(m.id)} className="mt-0.5 grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-card"><X className="size-4" /></button>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-muted-foreground">Chưa nhớ gì. Bố mẹ kể sở thích của bé, mình sẽ ghi nhớ nhé.</li>}
        </ul>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void add(); }}>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ví dụ: Bé thích xe cứu hỏa" aria-label="Thêm điều cần nhớ về bé" className="h-11" />
          <Button type="submit" size="icon" variant="outline" aria-label="Thêm" className="size-11"><Plus /></Button>
        </form>
        {error && <p role="alert" className="text-xs font-medium text-coral-strong">{error}</p>}
      </CardContent>
    </Card>
  );
}
