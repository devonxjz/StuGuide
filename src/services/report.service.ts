import { DEVELOPMENT_AREAS } from "@/core/constants/development-areas";
import { assertCan } from "@/core/guardrails";
import { NotFoundError } from "@/core/errors";
import type { Actor, ServiceDeps } from "./types";
import type { AuditService } from "./audit.service";

const DAY = 24 * 3600 * 1000;

const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export function createReportService({ repos }: ServiceDeps, audit: AuditService) {
  /** Trường của BGH lấy từ DB (không tin dữ liệu phía client). */
  const schoolOf = async (actor: Actor) => {
    const user = await repos.users.findById(actor.id);
    if (!user) throw new NotFoundError("tài khoản");
    return user.schoolId;
  };

  const build = async (schoolId: string) => {
    const since = Date.now() - 30 * DAY;
    const [plans, teacherCount, engagement] = await Promise.all([
      repos.lessonPlans.listBySchool(schoolId),
      repos.users.countTeachers(schoolId),
      repos.parentCards.engagementTotals(schoolId),
    ]);

    const approved = plans.filter((p) => p.status === "approved" || p.status === "shared");
    const recentlyCreated = plans.filter((p) => p.createdAt.getTime() >= since).length;
    // Số liệu thật: thời gian từ lúc AI soạn tới lúc được duyệt (giờ), với các bài duyệt trong 30 ngày
    const approvalHours = approved.filter((p) => p.approvedAt && p.approvedAt.getTime() >= since).map((p) => ((p.approvedAt as Date).getTime() - p.createdAt.getTime()) / 3_600_000);
    const medianHours = median(approvalHours);
    const verified = plans.filter((p) => p.legalReference?.isVerified).length;
    const maxCount = Math.max(1, ...DEVELOPMENT_AREAS.map((a) => approved.filter((p) => p.developmentArea === a.value).length));

    return {
      plans,
      kpis: {
        approvedLast30Days: approved.filter((p) => (p.approvedAt?.getTime() ?? 0) >= since).length,
        plansPerTeacher: Number((recentlyCreated / Math.max(1, teacherCount)).toFixed(1)),
        medianApprovalHours: medianHours === null ? null : Number(medianHours.toFixed(1)),
        legalComplianceRate: plans.length ? Math.round((verified / plans.length) * 100) : 100,
        parentEngagementRate: engagement.invited ? Math.round((engagement.responded / engagement.invited) * 100) : 0,
      },
      areaCoverage: DEVELOPMENT_AREAS.map((a) => {
        const count = approved.filter((p) => p.developmentArea === a.value).length;
        return { area: a.value, label: a.label, count, percent: Math.round((count / maxCount) * 100) };
      }),
    };
  };

  return {
    /** Màn hình 8 – chỉ BGH. */
    async dashboard(actor: Actor) {
      assertCan(actor.role, "school:read-all");
      const schoolId = await schoolOf(actor);
      const [data, logs] = await Promise.all([build(schoolId), repos.audit.listBySchool(schoolId, 12)]);
      return {
        kpis: data.kpis,
        areaCoverage: data.areaCoverage,
        approvalQueue: data.plans.filter((p) => p.status === "needs_review"),
        recentPlans: data.plans.slice(0, 8),
        auditLog: logs.map((l) => ({ id: l.id, action: l.action, actor: l.user?.fullName ?? "Không xác định", target: l.target, details: l.details, timestamp: l.timestamp })),
      };
    },

    async exportReport(actor: Actor) {
      assertCan(actor.role, "report:export");
      const schoolId = await schoolOf(actor);
      const school = await repos.users.findById(actor.id).then((u) => u && repos.users.schoolName(u.schoolId));
      const data = await build(schoolId);
      await audit.log({ userId: actor.id, action: "export_report", details: "Báo cáo kiểm định chất lượng giáo dục" });
      return {
        title: `Báo cáo kiểm định chất lượng giáo dục – ${school ?? "Nhà trường"}`,
        generatedAt: new Date(),
        kpis: data.kpis,
        areaCoverage: data.areaCoverage,
        totals: { plans: data.plans.length, approved: data.plans.filter((p) => p.status === "approved" || p.status === "shared").length },
        plans: data.plans.map((p) => ({ id: p.id, gameName: p.gameName, className: p.className, teacherName: p.teacherName, status: p.status, legalVerified: Boolean(p.legalReference?.isVerified), documentCode: p.legalReference?.documentCode ?? null })),
      };
    },
  };
}
export type ReportService = ReturnType<typeof createReportService>;
