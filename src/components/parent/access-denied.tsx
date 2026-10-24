import { ShieldX } from "lucide-react";

/** ERR-AUTH-01: phụ huynh cố xem hồ sơ trẻ khác. Sự kiện đã được ghi vào AuditLog. */
export function AccessDenied({ message }: { message: string }) {
  return (
    <div role="alert" className="mx-4 my-6 rounded-3xl border border-coral/40 bg-coral-soft p-6 text-center text-coral-strong animate-pop-in">
      <ShieldX className="mx-auto size-12" aria-hidden />
      <h2 className="mt-3 text-lg font-bold">Truy cập bị từ chối</h2>
      <p className="mt-2 text-sm leading-relaxed">{message}</p>
      <p className="mt-3 text-xs opacity-80">Sự kiện này đã được ghi vào nhật ký an ninh của nhà trường.</p>
    </div>
  );
}
