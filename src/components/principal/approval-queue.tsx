"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Eye, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { api, ApiError } from "@/lib/api-client";

export interface QueueItem {
  id: string;
  gameName: string | null;
  className: string;
  teacherName: string;
}

/** Hàng đợi duyệt giáo án gửi lên từ các lớp. */
export function ApprovalQueue({ items }: { items: QueueItem[] }) {
  const [list, setList] = useState(items);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (id: string, action: "approve" | "request-changes") => {
    setBusy(id);
    setError(null);
    try {
      if (action === "approve") await api(`/api/plans/${id}/approve`, { method: "POST", body: {} });
      else await api(`/api/plans/${id}/review`, { method: "POST", body: { action } });
      setList((cur) => cur.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Hàng đợi duyệt giáo án ({list.length})</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Không có giáo án nào đang chờ duyệt 🎉</p>}
        {list.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5">
            <div className="min-w-0">
              <p className="truncate font-semibold">{p.gameName}</p>
              <p className="text-xs text-muted-foreground">{p.className} · {p.teacherName}</p>
              <div className="mt-1"><StatusBadge status="needs_review" /></div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Link href={`/teacher/plan/${p.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold hover:bg-muted"><Eye className="size-4" aria-hidden /> Xem nhanh</Link>
              <Button size="sm" disabled={busy === p.id} onClick={() => act(p.id, "approve")}><CheckCircle2 /> Phê duyệt</Button>
              <Button size="sm" variant="danger" disabled={busy === p.id} onClick={() => act(p.id, "request-changes")}><XCircle /> Yêu cầu sửa lại</Button>
            </div>
          </div>
        ))}
        {error && <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral-strong">{error}</p>}
      </CardContent>
    </Card>
  );
}
