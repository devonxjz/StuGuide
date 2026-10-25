import Link from "next/link";
import { Printer, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Flashcard } from "@/core/schemas/lesson-plan.schema";

/** Bộ học liệu trực quan: mô tả flashcard do AI đề xuất, in A4 để cô giáo tô màu cùng trẻ. */
export function FlashcardGallery({ cards, planId }: { cards: Flashcard[]; planId: string }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Palette className="size-4 text-primary" aria-hidden /> Bộ học liệu trực quan (Flashcard)</CardTitle>
        <Link href={`/teacher/plan/${planId}/print`} target="_blank" className="inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold hover:bg-muted">
          <Printer className="size-3.5" aria-hidden /> In học liệu PDF
        </Link>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {cards.map((card, i) => (
          <figure key={i} className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary-soft/40 p-4 text-center">
            {card.emoji && <div className="text-5xl" aria-hidden>{card.emoji}</div>}
            <figcaption className="mt-2 text-xs leading-snug text-muted-foreground">{card.text}</figcaption>
          </figure>
        ))}
      </CardContent>
    </Card>
  );
}
