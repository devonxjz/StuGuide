"use client";

import { Badge } from "@/components/ui/badge";
import { useDeviceQuota, type DeviceQuota } from "@/hooks/use-device-quota";
import { cn } from "@/lib/utils";

/** Số lượt AI dùng thử: màu trung tính khi còn lượt, chỉ đổi màu khi sắp hết hoặc đã hết. */
export function DeviceQuotaBadge({
  quota: passedQuota,
  className,
  showNormal = true,
}: {
  quota?: DeviceQuota;
  className?: string;
  showNormal?: boolean;
}) {
  const { quota: hookQuota } = useDeviceQuota();
  const q = passedQuota ?? hookQuota;

  if (q.isExceeded) {
    return (
      <Badge tone="danger" className={cn("font-medium", className)} title="Thiết bị đã dùng hết lượt AI dùng thử">
        Quá hạn sử dụng, bạn phải mua thêm lượt
      </Badge>
    );
  }

  if (!showNormal) return null;

  return (
    <Badge
      tone={q.remaining <= 1 ? "warning" : "neutral"}
      className={cn("font-medium", className)}
      title={`Đã dùng ${q.used}/${q.limit} lượt AI dùng thử`}
    >
      AI: {q.used}/{q.limit} lượt
    </Badge>
  );
}
