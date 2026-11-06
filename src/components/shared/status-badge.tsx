import { Badge } from "@/components/ui/badge";
import { PLAN_STATUS_META, type PlanStatus } from "@/core/constants/status";

/** Nhãn trạng thái giáo án: Bản nháp AI · Cần rà soát · Đã duyệt · Đã chia sẻ */
export function StatusBadge({ status }: { status: PlanStatus }) {
  const meta = PLAN_STATUS_META[status];
  return (
    <Badge tone={meta.tone}>
      {meta.label}
    </Badge>
  );
}
