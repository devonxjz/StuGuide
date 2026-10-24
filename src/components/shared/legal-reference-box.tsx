import { Scale, BadgeCheck, TriangleAlert } from "lucide-react";
import type { LegalReference } from "@/core/schemas/lesson-plan.schema";

/** Hộp căn cứ pháp lý (nền xanh nhạt). Trích dẫn không đối chiếu được sẽ bị hạ cờ isVerified (BR-003). */
export function LegalReferenceBox({ reference }: { reference: LegalReference | null }) {
  if (!reference) return null;
  return (
    <section aria-label="Căn cứ pháp lý" className="rounded-2xl border border-primary/20 bg-card p-4 shadow-2xs">
      <h4 className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-bold text-primary-strong">
        <span className="grid size-6 place-items-center rounded-lg bg-primary-soft text-primary">
          <Scale className="size-3.5" aria-hidden />
        </span>
        Căn cứ pháp lý · {reference.documentCode}
        {reference.isVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-mint-soft px-2.5 py-0.5 text-[11px] font-bold text-mint-strong border border-mint/20">
            <BadgeCheck className="size-3.5" aria-hidden /> Đã đối chiếu kho tri thức
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-coral-soft px-2.5 py-0.5 text-[11px] font-bold text-coral-strong border border-coral/20">
            <TriangleAlert className="size-3.5" aria-hidden /> Chưa xác minh – cần kiểm tra lại
          </span>
        )}
      </h4>
      <p className="text-xs font-semibold text-muted-foreground">{reference.relevantSection}</p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/90">{reference.summary}</p>
    </section>
  );
}
