"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { SettingsDialog } from "@/components/shared/settings-dialog";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Role } from "@/core/constants/status";

const ROLE_LABEL: Record<Role, string> = {
  teacher: "Giáo viên",
  principal: "Ban giám hiệu",
  parent: "Phụ huynh",
};

/**
 * Nút người dùng ở góc: bấm mở menu nhỏ (Cài đặt · Đăng xuất), Ctrl+, mở thẳng Cài đặt.
 * variant "sidebar" hiện tên + vai trò và mở menu lên trên; "compact" chỉ có avatar và mở xuống dưới.
 */
export function UserMenu({
  role,
  userName,
  subtitle,
  variant = "sidebar",
}: {
  role: Role;
  userName: string;
  subtitle: string;
  variant?: "sidebar" | "compact";
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST", body: {} });
    router.push("/login");
  }, [router]);

  const openSettings = useCallback(() => {
    setMenuOpen(false);
    setSettingsOpen(true);
  }, []);

  // Đóng menu khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // Ctrl+, / Cmd+, : chỉ bản đang hiển thị (không bị ẩn bởi responsive) mới phản hồi
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        if (rootRef.current && rootRef.current.offsetParent === null) return;
        e.preventDefault();
        openSettings();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openSettings]);

  const initial = userName.trim().split(" ").pop()?.charAt(0);
  const itemClass = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-900 transition-colors hover:bg-slate-200/60";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={variant === "compact" ? `Tài khoản ${userName}` : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-xl text-left transition-colors hover:bg-slate-100",
          variant === "sidebar" ? "w-full p-2" : "p-1",
        )}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-medium text-slate-700">{initial}</span>
        {variant === "sidebar" && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-900">{userName}</span>
              <span className="block truncate text-xs text-slate-500">{subtitle}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-slate-400" aria-hidden />
          </>
        )}
      </button>

      {menuOpen && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-60 rounded-2xl border border-slate-200 bg-slate-100 p-1.5 shadow-xl animate-pop-in",
            variant === "sidebar" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2",
          )}
        >
          <button type="button" role="menuitem" onClick={openSettings} className={itemClass}>
            <Settings className="size-4 text-slate-500" aria-hidden />
            <span className="flex-1 text-left">Cài đặt</span>
            <kbd className="text-xs text-slate-400">Ctrl+,</kbd>
          </button>
          <div className="my-1 h-px bg-slate-200" aria-hidden />
          <button type="button" role="menuitem" onClick={logout} className={itemClass}>
            <LogOut className="size-4 text-slate-500" aria-hidden />
            <span className="flex-1 text-left">Đăng xuất</span>
          </button>
        </div>
      )}

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={logout}
        userName={userName}
        subtitle={subtitle}
        roleLabel={ROLE_LABEL[role]}
      />
    </div>
  );
}
