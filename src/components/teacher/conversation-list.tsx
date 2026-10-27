"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { newChatUrl } from "@/lib/ids";
import { cn, formatDateTime } from "@/lib/utils";

export interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
}

/** Lịch sử các cuộc trò chuyện đã lưu: mở lại để trợ lý nhớ tiếp ngữ cảnh. */
export function ConversationList({ items, activeId }: { items: ConversationItem[]; activeId?: string }) {
  const router = useRouter();

  const remove = async (id: string) => {
    await api(`/api/conversations/${id}`, { method: "DELETE" });
    router.push(id === activeId ? newChatUrl() : "/teacher");
    router.refresh();
  };

  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900">Cuộc trò chuyện</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => router.push(newChatUrl())} className="h-7 px-2 text-xs">
          <Plus className="size-3.5" /> Mới
        </Button>
      </CardHeader>
      <CardContent className="space-y-0.5 p-2 pt-0">
        {items.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">Chưa có cuộc trò chuyện nào.</p>}
        {items.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group flex items-center gap-1 rounded-xl pr-1 transition-all",
              c.id === activeId ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <Link
              href={`/teacher?c=${c.id}`}
              className="min-w-0 flex-1 px-2.5 py-2"
              aria-current={c.id === activeId ? "page" : undefined}
            >
              <span className="block truncate text-xs font-medium">{c.title}</span>
              <span className="text-[10px] text-slate-400">{formatDateTime(c.updatedAt)}</span>
            </Link>
            <button
              type="button"
              aria-label={`Xóa cuộc trò chuyện ${c.title}`}
              onClick={() => remove(c.id)}
              className="rounded-lg p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 transition-all"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
