import Link from "next/link";
import { LogoutButton } from "@/components/shared/logout-button";
import { Logo } from "@/components/shared/logo";
import { requireSession } from "@/server/session";

/** Cổng phụ huynh: tối ưu cho iPad (chạm lớn, bố cục rộng) và điện thoại. */
export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["parent"]);
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_20%_0%,var(--primary-soft),transparent_45%),radial-gradient(circle_at_90%_10%,var(--sun-soft),transparent_40%)]">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
        <Link href="/family"><Logo /></Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-medium sm:block">{session.fullName}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
