import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/teacher/print-button";
import { isAppError } from "@/core/errors";
import { idSchema } from "@/core/schemas/common.schema";
import type { Flashcard } from "@/core/schemas/lesson-plan.schema";
import { getContainer } from "@/server/container";
import { toActor } from "@/server/http";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "In học liệu" };

/** In học liệu A4: mỗi flashcard một nửa trang, có ô tô màu cùng trẻ. */
export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["teacher", "principal"]);
  const { id } = await params;
  const { services } = await getContainer();
  if (!idSchema.safeParse(id).success) notFound();
  const plan = await services.lessonPlanner.getForActor(id, toActor(session)).catch((e: unknown) => {
    if (isAppError(e)) return null;
    throw e;
  });
  if (!plan) notFound();

  const pages: Flashcard[][] = [];
  for (let i = 0; i < plan.flashcards.length; i += 2) pages.push(plan.flashcards.slice(i, i + 2));

  return (
    <div className="print-sheet mx-auto max-w-[210mm] p-6 print:max-w-none print:p-0">
      <Link href={`/teacher/plan/${id}`} className="no-print mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Quay lại giáo án
      </Link>
      <div className="no-print mb-6 flex items-center justify-between rounded-xl bg-primary-soft p-4 text-foreground">
        <div>
          <p className="font-bold">{plan.gameName}</p>
          <p className="text-sm text-muted-foreground">{plan.flashcards.length} flashcard · khổ A4 · chọn “Lưu dưới dạng PDF” khi in</p>
        </div>
        <PrintButton />
      </div>
      {pages.map((page, pi) => (
        <section key={pi} className="print-page">
          {page.map((card, i) => (
            <figure key={i} className="print-card flex flex-col items-center justify-between rounded-[2rem] border-[6px] border-dashed border-emerald-500 p-6 text-center">
              <figcaption className="text-2xl font-bold">{plan.gameName}</figcaption>
              <div className="my-4 grid aspect-square w-4/5 max-w-[70mm] place-items-center rounded-full border-4 border-emerald-300 bg-emerald-50 text-[100px]" aria-hidden>
                {card.emoji}
              </div>
              <p className="text-lg leading-snug">{card.text}</p>
              <p className="mt-2 text-sm text-gray-600">Tô màu cùng cô và các bạn nhé!</p>
            </figure>
          ))}
        </section>
      ))}
    </div>
  );
}
