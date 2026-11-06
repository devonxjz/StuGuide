"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, FileBarChart, HeartHandshake, LayoutDashboard, Mail, MessageSquare, Wand2 } from "lucide-react";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { ConversationList, type ConversationItem } from "@/components/teacher/conversation-list";
import { AppearanceSync } from "./appearance-sync";
import { cn } from "@/lib/utils";
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
    { href: "/teacher/contacts", label: "Danh bạ phụ huynh", icon: Mail },
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
  conversations = [],
  classes = [],
  currentClassId,
  children,
}: {
  role: Role;
  userName: string;
  subtitle: string;
  conversations?: ConversationItem[];
  classes?: { id: string; name: string }[];
  currentClassId?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV[role === "principal" ? "principal" : "teacher"];
  const home = role === "principal" ? "/principal" : "/teacher";
  const active = (href: string) => (href === home ? pathname === href : pathname.startsWith(href));

  return (
    <div className="flex min-h-dvh bg-white">
      <AppearanceSync />
      {/* Sidebar Desktop */}
      <aside className="no-print sticky top-0 z-30 hidden h-dvh w-60 shrink-0 flex-col border-r border-slate-200/80 bg-white p-4 md:flex">
        <Link href={home} className="mb-6 px-2 pt-1">
          <Logo />
        </Link>

        {role === "teacher" && <WorkspaceSwitcher classes={classes} currentId={currentClassId} />}

        <nav aria-label="Điều hướng chính" className="mb-4 space-y-0.5">
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

        {role === "teacher" ? <ConversationList items={conversations} /> : <div className="flex-1" />}

        {/* Góc dưới: bấm mở menu Cài đặt / Đăng xuất */}
        <div className="mt-2 border-t border-slate-100 pt-3">
          <UserMenu role={role} userName={userName} subtitle={subtitle} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-2.5 backdrop-blur-md md:px-6">
          <Link href={home} className="md:hidden">
            <Logo compact />
          </Link>
          <p className="hidden text-xs font-medium text-slate-500 md:block">{subtitle}</p>
          <div className="flex items-center gap-2.5">
            <div className="md:hidden">
              <UserMenu role={role} userName={userName} subtitle={subtitle} variant="compact" />
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
