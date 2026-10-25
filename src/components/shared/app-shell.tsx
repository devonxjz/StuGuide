"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardCheck,
  FileBarChart,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MessageSquareHeart,
  Palette,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import { Logo } from "./logo";
import { LogoutButton } from "./logout-button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { Role } from "@/core/constants/status";

const NAV: Record<
  "teacher" | "principal",
  {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    shadowTone: string;
    badge?: string;
  }[]
> = {
  teacher: [
    {
      href: "/teacher",
      label: "Trợ lý AI mầm non",
      icon: MessageSquareHeart,
      gradient: "from-blue-600 via-indigo-500 to-purple-600 text-white",
      shadowTone: "shadow-[0_4px_12px_rgba(99,102,241,0.28)]",
      badge: "AI ✨",
    },
    {
      href: "/teacher/create",
      label: "Soạn giáo án nhanh",
      icon: Wand2,
      gradient: "from-sky-400 to-blue-600 text-white",
      shadowTone: "shadow-[0_4px_12px_rgba(2,132,199,0.28)]",
    },
    {
      href: "/teacher/assess",
      label: "Ghi nhận quan sát 30s",
      icon: ClipboardCheck,
      gradient: "from-amber-400 to-orange-500 text-white",
      shadowTone: "shadow-[0_4px_12px_rgba(245,158,11,0.28)]",
      badge: "Nhanh ⚡",
    },
    {
      href: "/teacher/parent-cards",
      label: "Thẻ tương tác phụ huynh",
      icon: HeartHandshake,
      gradient: "from-pink-500 to-rose-500 text-white",
      shadowTone: "shadow-[0_4px_12px_rgba(244,63,94,0.28)]",
    },
  ],
  principal: [
    {
      href: "/principal",
      label: "Tổng quan trường",
      icon: LayoutDashboard,
      gradient: "from-blue-600 to-indigo-600 text-white",
      shadowTone: "shadow-[0_4px_12px_rgba(0,82,204,0.25)]",
    },
    {
      href: "/principal/report",
      label: "Báo cáo kiểm định",
      icon: FileBarChart,
      gradient: "from-emerald-400 to-teal-600 text-white",
      shadowTone: "shadow-[0_4px_12px_rgba(16,185,129,0.28)]",
      badge: "TT45 📜",
    },
  ],
};

export function AppShell({
  role,
  userName,
  subtitle,
  children,
}: {
  role: Role;
  userName: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV[role === "principal" ? "principal" : "teacher"];
  const active = (href: string) =>
    href === "/teacher" || href === "/principal" ? pathname === href : pathname.startsWith(href);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST", body: {} });
    router.push("/login");
  };

  return (
    <div className="flex min-h-dvh bg-white">
      {/* Sidebar Desktop */}
      <aside className="no-print sticky top-0 hidden h-dvh w-68 shrink-0 flex-col border-r border-slate-200/80 bg-white p-4.5 shadow-[2px_0_12px_rgba(0,0,0,0.02)] md:flex z-30">
        <Link
          href={role === "principal" ? "/principal" : "/teacher"}
          className="mb-6 px-2 pt-1 transition-transform hover:scale-[1.02]"
        >
          <Logo />
        </Link>

        <div className="px-2 mb-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {role === "principal" ? "Quản lý BGH" : "Không gian giáo viên"}
          </span>
        </div>

        <nav aria-label="Điều hướng chính" className="flex-1 space-y-1.5">
          {items.map(({ href, label, icon: Icon, gradient, shadowTone, badge }) => {
            const isCurrent = active(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 group relative select-none",
                  isCurrent
                    ? "bg-blue-50/90 text-blue-900 shadow-xs ring-1 ring-blue-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn(
                      "grid size-8.5 shrink-0 place-items-center rounded-xl bg-gradient-to-tr transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
                      gradient,
                      shadowTone
                    )}
                  >
                    <Icon className="size-4.5 transition-transform duration-300" />
                  </span>
                  <span className="truncate">{label}</span>
                </div>

                {badge && (
                  <span className="shrink-0 rounded-full bg-white/90 border border-slate-200/80 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 shadow-2xs group-hover:border-blue-300 group-hover:text-primary transition-colors">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card ở chân sidebar */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/60 to-slate-50/80 p-3.5 text-sm shadow-2xs mt-auto">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8.5 place-items-center rounded-xl bg-gradient-to-tr from-primary to-blue-600 text-white font-extrabold text-sm shadow-sm">
              {userName.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold truncate text-slate-900 text-xs flex items-center gap-1">
                {userName}
                <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </p>
              <p className="text-[11px] text-slate-500 truncate font-medium">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all duration-200 shadow-2xs active:scale-[0.98]"
          >
            <LogOut className="size-3.5" aria-hidden /> Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        {/* Top Header Mobile */}
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-2.5 backdrop-blur-md md:px-6">
          <Link href={role === "principal" ? "/principal" : "/teacher"} className="md:hidden">
            <Logo compact />
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse-soft" />
            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span>🏫</span> {subtitle}
            </p>
          </div>
          <div className="md:hidden">
            <LogoutButton />
          </div>
        </header>

        {/* Mobile Quick Nav */}
        <nav
          aria-label="Điều hướng nhanh"
          className="no-print flex gap-2 overflow-x-auto border-b border-slate-200/80 bg-white px-3 py-2 md:hidden"
        >
          {items.map(({ href, label, icon: Icon, gradient, shadowTone }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                active(href)
                  ? "bg-blue-50 text-blue-900 ring-1 ring-blue-300"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <span className={cn("grid size-6 place-items-center rounded-lg bg-gradient-to-tr text-white", gradient)}>
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1 bg-white">{children}</main>
      </div>
    </div>
  );
}
