import type { Metadata } from "next";
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
    <div className="mx-auto max-w-[210mm] bg-white p-6 text-black print:p-0">
      <div className="no-print mb-6 flex items-center justify-between rounded-2xl bg-primary-soft p-4 text-foreground">
        <div>
          <p className="font-bold">{plan.gameName}</p>
          <p className="text-sm text-muted-foreground">{plan.flashcards.length} flashcard · khổ A4 · chọn “Lưu dưới dạng PDF” khi in</p>
        </div>
        <PrintButton />
      </div>
      {pages.map((page, pi) => (
        <section key={pi} className="print-page grid gap-6" style={{ minHeight: "270mm" }}>
          {page.map((card, i) => (
            <figure key={i} className="flex flex-col items-center justify-between rounded-[2rem] border-[6px] border-dashed border-emerald-400 p-8 text-center" style={{ minHeight: "125mm" }}>
              <figcaption className="text-2xl font-bold">{plan.gameName}</figcaption>
              <div className="my-4 grid aspect-square w-4/5 max-w-[80mm] place-items-center rounded-full border-4 border-black/70 text-[110px] grayscale" aria-hidden>
                {card.emoji}
              </div>
              <p className="text-lg leading-snug">{card.text}</p>
              <p className="mt-3 text-sm text-gray-500">Tô màu cùng cô và các bạn nhé!</p>
            </figure>
          ))}
        </section>
      ))}
    </div>
  );
}
