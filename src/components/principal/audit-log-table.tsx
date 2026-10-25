import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

const ACTIONS: Record<string, { label: string; tone: "neutral" | "success" | "danger" | "info" | "warning" }> = {
  login: { label: "Đăng nhập", tone: "neutral" },
  login_failed: { label: "Đăng nhập thất bại", tone: "warning" },
  create_plan: { label: "Tạo giáo án", tone: "info" },
  approve_plan: { label: "Phê duyệt giáo án", tone: "success" },
  submit_review: { label: "Gửi BGH duyệt", tone: "info" },
  request_changes: { label: "Yêu cầu sửa lại", tone: "warning" },
  create_checklist: { label: "Tạo checklist", tone: "info" },
  save_assessment: { label: "Lưu đánh giá", tone: "neutral" },
  create_card: { label: "Soạn thẻ phụ huynh", tone: "info" },
  send_card: { label: "Gửi thẻ phụ huynh", tone: "success" },
  parent_feedback: { label: "Phụ huynh phản hồi", tone: "neutral" },
  export_report: { label: "Xuất báo cáo", tone: "info" },
  access_denied: { label: "Truy cập bị từ chối", tone: "danger" },
};

export interface AuditRow {
  id: string;
  action: string;
  actor: string;
  details: string | null;
  timestamp: string | Date;
}

/** Nhật ký an ninh & thao tác. Các sự kiện bị từ chối truy cập nổi bật màu đỏ. */
export function AuditLogTable({ rows }: { rows: AuditRow[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Nhật ký an ninh & thao tác</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto p-2 pt-0">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr><th className="px-3 py-2 font-semibold">Thời gian</th><th className="px-3 py-2 font-semibold">Người thực hiện</th><th className="px-3 py-2 font-semibold">Hành động</th><th className="px-3 py-2 font-semibold">Chi tiết</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const meta = ACTIONS[r.action] ?? { label: r.action, tone: "neutral" as const };
              return (
                <tr key={r.id} className={meta.tone === "danger" ? "border-t bg-coral-soft/50" : "border-t"}>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground tabular-nums">{formatDateTime(r.timestamp)}</td>
                  <td className="px-3 py-2">{r.actor}</td>
                  <td className="px-3 py-2"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                  <td className="px-3 py-2 text-muted-foreground">{r.details ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
