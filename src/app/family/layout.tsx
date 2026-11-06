import Link from "next/link";
import { AppearanceSync } from "@/components/shared/appearance-sync";
import { UserMenu } from "@/components/shared/user-menu";
import { Logo } from "@/components/shared/logo";
import { requireSession } from "@/server/session";

/** Cổng phụ huynh: tối ưu cho iPad (chạm lớn, bố cục rộng) và điện thoại. */
export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["parent"]);
  return (
    <div className="min-h-dvh bg-white">
      <AppearanceSync />
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
        <Link href="/family"><Logo /></Link>
        <div className="flex items-center gap-3">
          <UserMenu role="parent" userName={session.fullName} subtitle="Phụ huynh" variant="compact" />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
