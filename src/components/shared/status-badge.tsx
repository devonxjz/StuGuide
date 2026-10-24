import { CircleDot, Eye, CircleCheck, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PLAN_STATUS_META, type PlanStatus } from "@/core/constants/status";

const ICONS = { ai_draft: CircleDot, needs_review: Eye, approved: CircleCheck, shared: Share2 } as const;

/** Nhãn trạng thái giáo án: 🔘 Bản nháp AI · 🟡 Cần rà soát · 🟢 Đã duyệt · 🔵 Đã chia sẻ */
export function StatusBadge({ status }: { status: PlanStatus }) {
  const meta = PLAN_STATUS_META[status];
  const Icon = ICONS[status];
  return (
    <Badge tone={meta.tone}>
      <Icon aria-hidden />
      {meta.label}
    </Badge>
  );
}
