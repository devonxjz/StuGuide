"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { newChatUrl } from "@/lib/ids";
import { cn, formatDateTime } from "@/lib/utils";

export interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
}

/** Lịch sử các cuộc trò chuyện đã lưu, nằm ở sidebar trái: mở lại để trợ lý nhớ tiếp ngữ cảnh. */
export function ConversationList({ items }: { items: ConversationItem[] }) {
  const router = useRouter();
  const activeId = useSearchParams().get("c") ?? undefined;

  const remove = async (id: string) => {
    await api(`/api/conversations/${id}`, { method: "DELETE" });
    router.push(id === activeId ? newChatUrl() : "/teacher");
    router.refresh();
  };

  return (
    <section aria-label="Cuộc trò chuyện" className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 pb-1">
        <h2 className="text-xs font-medium text-slate-500">Cuộc trò chuyện</h2>
        <button
          type="button"
          onClick={() => router.push(newChatUrl())}
          className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Plus className="size-3.5" aria-hidden /> Mới
        </button>
      </div>
      <div className="scroll-thin min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {items.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">Chưa có cuộc trò chuyện nào.</p>}
        {items.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
              c.id === activeId ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <Link href={`/teacher?c=${c.id}`} className="min-w-0 flex-1 px-3 py-1.5" aria-current={c.id === activeId ? "page" : undefined}>
              <span className="block truncate text-[13px]">{c.title}</span>
              <span className="text-[10px] text-slate-400">{formatDateTime(c.updatedAt)}</span>
            </Link>
            <button
              type="button"
              aria-label={`Xóa cuộc trò chuyện ${c.title}`}
              onClick={() => remove(c.id)}
              className="rounded-md p-1 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
