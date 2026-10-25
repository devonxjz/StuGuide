import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getContainer } from "@/server/container";
import { requireSession } from "@/server/session";
import { toActor } from "@/server/http";

export const metadata = { title: "Cổng phụ huynh" };

export default async function FamilyHome() {
  const session = await requireSession(["parent"]);
  const { family } = await getContainer();
  const kids = await family.profiles.childrenOf(toActor(session));
  if (kids.length === 1) redirect(`/family/child/${kids[0].id}`);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-semibold text-primary-strong">Xin chào {session.fullName}</p>
        <h1 className="text-2xl font-bold tracking-tight">Chọn bé để xem con đang học gì</h1>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {kids.map((k) => (
          <Link key={k.id} href={`/family/child/${k.id}`} className="flex min-h-24 items-center gap-4 rounded-3xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary">
            <span className="grid size-16 place-items-center rounded-2xl bg-sun-soft text-4xl" aria-hidden>{k.emoji}</span>
            <span className="flex-1"><span className="block text-lg font-bold">{k.fullName}</span><span className="text-sm text-muted-foreground">{k.className} · {k.ageLabel}</span></span>
            <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
          </Link>
        ))}
        {kids.length === 0 && <p className="text-muted-foreground">Tài khoản này chưa được nhà trường liên kết với bé nào.</p>}
      </div>
    </div>
  );
}
