"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, Trash2 } from "lucide-react";
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
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Cuộc trò chuyện</CardTitle>
        <Button size="sm" variant="soft" onClick={() => router.push(newChatUrl())}>
          <MessageSquarePlus /> Mới
        </Button>
      </CardHeader>
      <CardContent className="space-y-0.5 p-2 pt-0">
        {items.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">Chưa có cuộc trò chuyện nào.</p>}
        {items.map((c) => (
          <div key={c.id} className={cn("group flex items-center gap-1 rounded-xl pr-1", c.id === activeId ? "bg-primary-soft" : "hover:bg-muted")}>
            <Link href={`/teacher?c=${c.id}`} className="min-w-0 flex-1 px-2.5 py-2" aria-current={c.id === activeId ? "page" : undefined}>
              <span className="block truncate text-sm font-semibold">{c.title}</span>
              <span className="text-[11px] text-muted-foreground">{formatDateTime(c.updatedAt)}</span>
            </Link>
            <button type="button" aria-label={`Xóa cuộc trò chuyện ${c.title}`} onClick={() => remove(c.id)} className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-card focus-visible:opacity-100">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
