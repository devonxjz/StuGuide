import { Scale, BadgeCheck, TriangleAlert } from "lucide-react";
import type { LegalReference } from "@/core/schemas/lesson-plan.schema";

/** Hộp căn cứ pháp lý (nền xanh nhạt). Trích dẫn không đối chiếu được sẽ bị hạ cờ isVerified (BR-003). */
export function LegalReferenceBox({ reference }: { reference: LegalReference | null }) {
  if (!reference) return null;
  return (
    <section aria-label="Căn cứ pháp lý" className="rounded-2xl border border-primary/30 bg-primary-soft/70 p-4">
      <h4 className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-bold text-primary-strong">
        <Scale className="size-4" aria-hidden /> Căn cứ pháp lý · {reference.documentCode}
        {reference.isVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-primary-strong">
            <BadgeCheck className="size-3" aria-hidden /> Đã đối chiếu kho tri thức
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-semibold text-coral-strong">
            <TriangleAlert className="size-3" aria-hidden /> Chưa xác minh – cần kiểm tra lại
          </span>
        )}
      </h4>
      <p className="text-xs font-medium text-primary-strong/80">{reference.relevantSection}</p>
      <p className="mt-1.5 text-sm leading-relaxed">{reference.summary}</p>
    </section>
  );
}
