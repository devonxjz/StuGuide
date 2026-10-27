"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardCheck, FileBarChart, HeartHandshake, LayoutDashboard, LogOut, MessageSquare, Wand2 } from "lucide-react";
import { Logo } from "./logo";
import { LogoutButton } from "./logout-button";
import { DeviceQuotaBadge } from "./device-quota-badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { Role } from "@/core/constants/status";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: Record<"teacher" | "principal", NavItem[]> = {
  teacher: [
    { href: "/teacher", label: "Trợ lý AI", icon: MessageSquare },
    { href: "/teacher/create", label: "Soạn giáo án", icon: Wand2 },
    { href: "/teacher/assess", label: "Quan sát 30s", icon: ClipboardCheck },
    { href: "/teacher/parent-cards", label: "Thẻ phụ huynh", icon: HeartHandshake },
  ],
  principal: [
    { href: "/principal", label: "Tổng quan trường", icon: LayoutDashboard },
    { href: "/principal/report", label: "Báo cáo kiểm định", icon: FileBarChart },
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
  const home = role === "principal" ? "/principal" : "/teacher";
  const active = (href: string) => (href === home ? pathname === href : pathname.startsWith(href));

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST", body: {} });
    router.push("/login");
  };

  return (
    <div className="flex min-h-dvh bg-white">
      {/* Sidebar Desktop */}
      <aside className="no-print sticky top-0 z-30 hidden h-dvh w-60 shrink-0 flex-col border-r border-slate-200/80 bg-white p-4 md:flex">
        <Link href={home} className="mb-8 px-2 pt-1">
          <Logo />
        </Link>

        <nav aria-label="Điều hướng chính" className="flex-1 space-y-0.5">
          {items.map(({ href, label, icon: Icon }) => {
            const isCurrent = active(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  isCurrent ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Icon className={cn("size-4 shrink-0", isCurrent ? "text-primary" : "text-slate-400")} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Người dùng + đăng xuất */}
        <div className="flex items-center gap-2.5 border-t border-slate-100 px-2 pt-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {userName.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900">{userName}</p>
            <p className="truncate text-[11px] text-slate-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-2.5 backdrop-blur-md md:px-6">
          <Link href={home} className="md:hidden">
            <Logo compact />
          </Link>
          <p className="hidden text-xs font-medium text-slate-500 md:block">{subtitle}</p>
          <div className="flex items-center gap-2.5">
            <DeviceQuotaBadge />
            <div className="md:hidden">
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Điều hướng nhanh trên mobile */}
        <nav aria-label="Điều hướng nhanh" className="no-print flex gap-1 overflow-x-auto border-b border-slate-200/80 bg-white px-3 py-2 md:hidden">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors",
                active(href) ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-500 hover:bg-slate-50",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1 bg-white">{children}</main>
      </div>
    </div>
  );
}
