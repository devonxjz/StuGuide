"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardCheck, FileBarChart, LayoutDashboard, LogOut, MessageCircle, Users, Wand2 } from "lucide-react";
import { Logo } from "./logo";
import { LogoutButton } from "./logout-button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { Role } from "@/core/constants/status";

const NAV: Record<"teacher" | "principal", { href: string; label: string; icon: typeof MessageCircle; match?: string }[]> = {
  teacher: [
    { href: "/teacher", label: "Trợ lý chat", icon: MessageCircle },
    { href: "/teacher/create", label: "Tạo nhanh bằng form", icon: Wand2 },
    { href: "/teacher/assess", label: "Ghi nhận quan sát", icon: ClipboardCheck },
    { href: "/teacher/parent-cards", label: "Thẻ phụ huynh", icon: Users },
  ],
  principal: [
    { href: "/principal", label: "Tổng quan trường", icon: LayoutDashboard },
    { href: "/principal/report", label: "Báo cáo kiểm định", icon: FileBarChart },
  ],
};

export function AppShell({ role, userName, subtitle, children }: { role: Role; userName: string; subtitle: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV[role === "principal" ? "principal" : "teacher"];
  const active = (href: string) => (href === "/teacher" || href === "/principal" ? pathname === href : pathname.startsWith(href));

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST", body: {} });
    router.push("/login");
  };

  return (
    <div className="flex min-h-dvh">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card/60 p-4 backdrop-blur md:flex">
        <Link href={role === "principal" ? "/principal" : "/teacher"} className="mb-6 px-2 pt-1">
          <Logo />
        </Link>
        <nav aria-label="Điều hướng chính" className="flex-1 space-y-1">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors", active(href) ? "bg-primary-soft text-primary-strong" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
            >
              <Icon className="size-4.5" aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        <div className="rounded-2xl bg-muted p-3 text-sm">
          <p className="font-semibold">{userName}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          <button type="button" onClick={logout} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <LogOut className="size-3.5" aria-hidden /> Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-2.5 backdrop-blur md:px-6">
          <Link href={role === "principal" ? "/principal" : "/teacher"} className="md:hidden">
            <Logo compact />
          </Link>
          <p className="hidden text-sm font-medium text-muted-foreground md:block">{subtitle}</p>
          <div className="md:hidden">
            <LogoutButton />
          </div>
        </header>

        <nav aria-label="Điều hướng nhanh" className="no-print flex gap-1 overflow-x-auto border-b bg-card/60 px-3 py-2 md:hidden">
          {items.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold", active(href) ? "bg-primary-soft text-primary-strong" : "text-muted-foreground")}>
              <Icon className="size-3.5" aria-hidden /> {label}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
