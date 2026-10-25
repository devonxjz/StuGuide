"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDeviceQuota, type DeviceQuota } from "@/hooks/use-device-quota";
import { cn } from "@/lib/utils";

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
      <Badge
        tone="danger"
        className={cn(
          "font-bold shadow-xs animate-pulse flex items-center gap-1.5 py-1 px-3 border-rose-300 text-rose-900 bg-rose-50",
          className,
        )}
        title="Thiết bị của bạn đã đạt giới hạn tối đa 5 lượt làm việc với AI"
      >
        <AlertCircle className="size-3.5 shrink-0 text-rose-600" aria-hidden />
        <span>Quá hạn sử dụng, bạn phải mua thêm lượt</span>
      </Badge>
    );
  }

  if (!showNormal) return null;

  return (
    <Badge
      tone={q.remaining <= 1 ? "warning" : "ai"}
      className={cn("font-semibold flex items-center gap-1.5 py-0.5 px-2.5", className)}
      title={`Thiết bị đã sử dụng ${q.used}/${q.limit} lượt làm việc với AI`}
    >
      <Sparkles className="size-3.5 shrink-0 text-purple-600" aria-hidden />
      <span>AI: {q.used}/{q.limit} lượt</span>
    </Badge>
  );
}
