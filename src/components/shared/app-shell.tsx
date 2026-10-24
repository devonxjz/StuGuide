"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardCheck, FileBarChart, LayoutDashboard, LogOut, MessageCircle, Users, Wand2 } from "lucide-react";
import { Logo } from "./logo";
import { LogoutButton } from "./logout-button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { Role } from "@/core/constants/status";

const NAV: Record<
  "teacher" | "principal",
  { href: string; label: string; icon: typeof MessageCircle; iconColor: string; bgTone: string }[]
> = {
  teacher: [
    { href: "/teacher", label: "Trợ lý chat", icon: MessageCircle, iconColor: "text-lilac-strong", bgTone: "bg-lilac-soft" },
    { href: "/teacher/create", label: "Tạo nhanh bằng form", icon: Wand2, iconColor: "text-primary-strong", bgTone: "bg-primary-soft" },
    { href: "/teacher/assess", label: "Ghi nhận quan sát", icon: ClipboardCheck, iconColor: "text-sun-strong", bgTone: "bg-sun-soft" },
    { href: "/teacher/parent-cards", label: "Thẻ phụ huynh", icon: Users, iconColor: "text-sky-strong", bgTone: "bg-sky-soft" },
  ],
  principal: [
    { href: "/principal", label: "Tổng quan trường", icon: LayoutDashboard, iconColor: "text-primary-strong", bgTone: "bg-primary-soft" },
    { href: "/principal/report", label: "Báo cáo kiểm định", icon: FileBarChart, iconColor: "text-mint-strong", bgTone: "bg-mint-soft" },
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
    <div className="flex min-h-dvh bg-background">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/80 bg-card p-4 shadow-xs md:flex">
        <Link href={role === "principal" ? "/principal" : "/teacher"} className="mb-6 px-2 pt-1">
          <Logo />
        </Link>
        <nav aria-label="Điều hướng chính" className="flex-1 space-y-1.5">
          {items.map(({ href, label, icon: Icon, iconColor, bgTone }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 group",
                active(href)
                  ? "bg-primary-soft text-primary-strong shadow-xs ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <span className={cn("grid size-7.5 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-110 shadow-2xs", bgTone, iconColor)}>
                <Icon className="size-4" aria-hidden />
              </span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="rounded-2xl border border-border/70 bg-muted/50 p-3.5 text-sm shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs">
              {userName.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold truncate text-foreground text-xs">{userName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-card py-1.5 text-xs font-semibold text-muted-foreground hover:text-coral-strong hover:border-coral/30 hover:bg-coral-soft/50 transition-colors"
          >
            <LogOut className="size-3.5" aria-hidden /> Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/70 bg-card/85 px-4 py-2.5 backdrop-blur-md md:px-6">
          <Link href={role === "principal" ? "/principal" : "/teacher"} className="md:hidden">
            <Logo compact />
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <span className="size-2 rounded-full bg-mint animate-pulse-soft" />
            <p className="text-xs font-semibold text-muted-foreground">{subtitle}</p>
          </div>
          <div className="md:hidden">
            <LogoutButton />
          </div>
        </header>

        <nav aria-label="Điều hướng nhanh" className="no-print flex gap-1.5 overflow-x-auto border-b border-border/70 bg-card px-3 py-2 md:hidden">
          {items.map(({ href, label, icon: Icon, iconColor, bgTone }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                active(href) ? "bg-primary-soft text-primary-strong ring-1 ring-primary/20" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span className={cn("grid size-5.5 place-items-center rounded-md", bgTone, iconColor)}>
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
