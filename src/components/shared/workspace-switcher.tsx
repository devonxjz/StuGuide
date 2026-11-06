"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/** Chọn khu vực làm việc (lớp). Chỉ hiện khi giáo viên phụ trách từ hai lớp trở lên. */
export function WorkspaceSwitcher({ classes, currentId }: { classes: { id: string; name: string }[]; currentId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (classes.length < 2) return null;
  const current = classes.find((c) => c.id === currentId) ?? classes[0];

  const choose = async (classId: string) => {
    setOpen(false);
    if (classId === current.id) return;
    await api("/api/workspace", { method: "POST", body: { classId } });
    router.push("/teacher");
    router.refresh();
  };

  return (
    <div className="relative mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Chọn khu vực làm việc"
        className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-slate-500">Khu vực làm việc</span>
          <span className="block truncate font-medium text-slate-900">{current.name}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-slate-400" aria-hidden />
      </button>
      {open && (
        <ul role="listbox" className="absolute top-full right-0 left-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {classes.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                role="option"
                aria-selected={c.id === current.id}
                onClick={() => choose(c.id)}
                className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100", c.id === current.id && "font-medium")}
              >
                <span className="flex-1 truncate">{c.name}</span>
                {c.id === current.id && <Check className="size-4 text-slate-500" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
