"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, ExternalLink, Pencil, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { LegalReferenceBox } from "@/components/shared/legal-reference-box";
import { SafetyAlertBox } from "@/components/shared/safety-alert-box";
import { PlanBody } from "@/components/teacher/plan-body";
import { api, ApiError } from "@/lib/api-client";
import { getAgeLabel } from "@/core/constants/age-groups";
import { getAreaLabel } from "@/core/constants/development-areas";
import { usePlanStore } from "@/stores/plan.store";
import type { CardData, PlanDTO } from "@/types/chat";
import { useChatActions } from "../chat-context";

/** Thẻ giáo án trong khung chat: đọc nhanh, phê duyệt tại chỗ, mở trang chi tiết để chỉnh sửa. */
export function PlanCard({ data, restored = false }: { data: Extract<CardData, { kind: "plan" }>; restored?: boolean }) {
  const stored = usePlanStore((s) => s.plans[data.planId]);
  const setPlan = usePlanStore((s) => s.setPlan);
  const { send } = useChatActions();
  const plan: PlanDTO = stored ?? data.plan;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlan(data.plan);
    // Thẻ khôi phục từ lịch sử chỉ là ảnh chụp lúc tạo: nạp trạng thái hiện tại (đã duyệt/đã chia sẻ…) từ server
    if (!restored) return;
    let cancelled = false;
    api<{ plan: PlanDTO }>(`/api/plans/${data.planId}`)
      .then((res) => !cancelled && setPlan(res.plan))
      .catch(() => {}); // giữ ảnh chụp nếu không nạp được
    return () => {
      cancelled = true;
    };
  }, [data.plan, data.planId, restored, setPlan]);

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ plan: PlanDTO }>(`/api/plans/${plan.id}/approve`, { method: "POST", body: {} });
      setPlan(res.plan);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setBusy(false);
    }
  };

  const approved = plan.status === "approved" || plan.status === "shared";

  return (
    <Card className="max-w-[44rem] overflow-hidden animate-pop-in">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="ai">
            <Sparkles aria-hidden /> AI soạn
          </Badge>
          <StatusBadge status={plan.status} />
          {data.violations.length > 0 && (
            <Badge tone="warning">
              <ShieldCheck aria-hidden /> {data.violations.length} điểm cần cô xem lại
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg">{plan.gameName}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {getAgeLabel(plan.ageGroup)} · {getAreaLabel(plan.developmentArea)} · {plan.duration} phút · {plan.space === "indoor" ? "Trong lớp" : "Ngoài sân"} · {plan.materials.join(", ")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <LegalReferenceBox reference={plan.legalReference} />
        <SafetyAlertBox warnings={plan.safetyWarnings} />
        {data.violations.length > 0 && (
          <ul className="space-y-1 rounded-xl bg-sun-soft/60 p-3 text-xs leading-relaxed">
            {data.violations.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        )}
        {data.awaiting === "approve" && !approved && (
          <p role="status" className="rounded-xl bg-primary-soft px-3 py-2 text-sm font-medium text-primary-strong">
            Trợ lý không tự phê duyệt. Cô xem lại rồi bấm “Phê duyệt & Tạo checklist” để xác nhận.
          </p>
        )}
        {open && <PlanBody plan={plan} />}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary-strong hover:underline"
        >
          {open ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
          {open ? "Thu gọn kịch bản" : "Xem kịch bản đầy đủ (mục tiêu, cách chơi, lời dẫn)"}
        </button>
        {error && (
          <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral-strong">
            {error}
          </p>
        )}
      </CardContent>
      <CardFooter>
        {!approved && (
          <Button onClick={approve} disabled={busy} variant="primary">
            <CheckCircle2 /> {busy ? "Đang duyệt…" : "Phê duyệt & Tạo checklist"}
          </Button>
        )}
        {approved && (
          <>
            <Link href={`/teacher/assess/${plan.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft">
              <ClipboardCheck className="size-4" aria-hidden /> Ghi nhận quan sát (30 giây)
            </Link>
            {plan.status === "approved" && (
              <Button variant="soft" onClick={() => send("Soạn thẻ nhiệm vụ 5 phút cho phụ huynh")}>
                <Users /> Soạn thẻ cho phụ huynh
              </Button>
            )}
          </>
        )}
        <Link href={`/teacher/plan/${plan.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold hover:bg-muted">
          {plan.status === "shared" ? <ExternalLink className="size-4" aria-hidden /> : <Pencil className="size-4" aria-hidden />} Mở chi tiết {plan.status === "shared" ? "" : "& chỉnh sửa"}
        </Link>
      </CardFooter>
    </Card>
  );
}
