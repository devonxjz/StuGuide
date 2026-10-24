import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { AGE_GROUP_VALUES } from "@/core/constants/age-groups";
import { DEVELOPMENT_AREA_VALUES } from "@/core/constants/development-areas";
import { PLAN_STATUS_META } from "@/core/constants/status";
import { EDITABLE_SECTIONS } from "@/core/schemas/lesson-plan.schema";
import { AppError, isAppError, isZodError } from "@/core/errors";
import { fenceUntrusted } from "@/ai/prompts/_shared/untrusted";
import type { PlanRecord, Repositories } from "@/data/repositories";
import type { Actor } from "../types";
import type { Services } from "../index";
import type { CardData, PlanDTO } from "@/types/chat";
import type { ChildProfileService } from "../family/child-profile.service";
import { blockingIssues } from "../lesson-planner.service";

export interface ToolContext {
  actor: Actor;
  services: Services;
  repos: Repositories;
  /** Giáo án đang làm việc; chỉ cập nhật sau khi đã kiểm tra quyền */
  focus: { planId?: string };
  /** Hồ sơ cá nhân hóa của bé (chỉ khi phụ huynh đã đồng ý chia sẻ) */
  profiles: ChildProfileService;
  /** Ghi nhớ dài hạn về cô/lớp */
  remember: (content: string) => Promise<string>;
  /**
   * Trạng thái "nhiễm" của lượt chat: true khi lượt này đã nạp dữ liệu do phụ huynh viết (hồ sơ bé).
   * Khi đó các thao tác ghi bền vững do AI tự quyết (ghi nhớ) bị chặn – chống prompt injection lan sang trí nhớ của cô.
   */
  turn: { tainted: boolean };
}

type Result = [content: string, artifact: CardData];
type ToolConfig = { writer?: ((chunk: unknown) => void) | null };
const DURATIONS = [15, 20, 25, 30] as const;
const snapDuration = (n: number) => DURATIONS.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));

const fold = (s: string) => s.normalize("NFC").toLowerCase().replace(/^(bé|bạn)\s+/, "").trim();
const toDTO = (plan: PlanRecord): PlanDTO => JSON.parse(JSON.stringify(plan)) as PlanDTO;
const notice = (message: string): Result => [message, { kind: "notice", tone: "warning", message }];

/** Chuyển lỗi nghiệp vụ thành phản hồi thân thiện thay vì làm hỏng cả lượt chat. */
function guarded<A>(fn: (args: A, config: ToolConfig) => Promise<Result>) {
  return async (args: A, config: ToolConfig): Promise<Result> => {
    try {
      return await fn(args, config);
    } catch (error) {
      if (isAppError(error)) return notice(error.message);
      if (isZodError(error)) return notice(`Thiếu hoặc sai thông tin: ${error.issues.map((i) => i.message).join("; ")}`);
      throw error;
    }
  };
}

const planIdArg = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional().describe("planId; mặc định là giáo án đang làm việc");

export function createActionTools(ctx: ToolContext) {
  const { actor, services, repos, focus, remember, profiles, turn } = ctx;

  /** Xác định giáo án mục tiêu VÀ kiểm tra quyền trước khi ghi nhận làm "giáo án đang làm việc". */
  const resolvePlan = async (explicit?: string): Promise<PlanRecord> => {
    const id = explicit ?? focus.planId ?? (await repos.lessonPlans.listByClass(actor.classId ?? "", 1))[0]?.id;
    if (!id) throw new AppError("ERR-NO-PLAN", "Lớp chưa có giáo án nào. Cô muốn mình soạn trò chơi về chủ đề gì?", 404);
    const plan = await services.lessonPlanner.getForActor(id, actor);
    focus.planId = plan.id;
    return plan;
  };

  const createLessonPlan = tool(
    guarded(async (args: { ageGroup?: (typeof AGE_GROUP_VALUES)[number]; developmentArea: (typeof DEVELOPMENT_AREA_VALUES)[number]; topic: string; materials: string[]; duration: number; space: "indoor" | "outdoor"; stemEnabled?: boolean; folkGameEnabled?: boolean; classNotes?: string }, config) => {
      const cls = await repos.users.findClass(actor.classId ?? "");
      const { plan, violations } = await services.lessonPlanner.create(
        {
          ageGroup: args.ageGroup ?? (cls?.ageGroup as never),
          developmentArea: args.developmentArea,
          topic: args.topic,
          materials: args.materials,
          duration: snapDuration(args.duration),
          space: args.space,
          stemEnabled: args.stemEnabled ?? false,
          folkGameEnabled: args.folkGameEnabled ?? false,
          classNotes: args.classNotes,
        },
        actor,
        { onStep: (step) => config.writer?.({ type: "step", step }) },
      );
      focus.planId = plan.id;

      const blocking = violations.filter((v) => v.message.startsWith("Bắt buộc"));
      const content = [
        `Đã tạo bản nháp "${plan.gameName}" (planId=${plan.id}, ${PLAN_STATUS_META[plan.status].label}).`,
        `Căn cứ: ${plan.legalReference?.documentCode || "chưa có"} (${plan.legalReference?.isVerified ? "đã đối chiếu kho tri thức" : "CHƯA xác minh"}); ${plan.safetyWarnings.length} cảnh báo an toàn.`,
        blocking.length ? `CÒN ${blocking.length} vi phạm bắt buộc nên chưa thể phê duyệt: ${blocking.map((v) => v.message).join(" | ")}` : "",
        violations.length - blocking.length > 0 ? `${violations.length - blocking.length} điểm chất lượng cô nên xem lại.` : "",
      ]
        .filter(Boolean)
        .join("\n");
      return [content, { kind: "plan", planId: plan.id, plan: toDTO(plan), violations: violations.map((v) => v.message) }];
    }),
    {
      name: "create_lesson_plan",
      description:
        "Soạn kế hoạch & trò chơi giáo dục mới (bản nháp AI, tự chấm theo tiêu chí). Điền tham số từ lời cô và bối cảnh lớp; không đủ cơ sở để suy ra chủ đề/học liệu thì hỏi cô trước.",
      schema: z.object({
        ageGroup: z.enum(AGE_GROUP_VALUES).optional().describe("Nhóm tuổi; bỏ trống = nhóm tuổi của lớp"),
        developmentArea: z.enum(DEVELOPMENT_AREA_VALUES).describe("Mảng phát triển trọng tâm, suy ra từ mục đích cô nêu"),
        topic: z.string().min(1).max(120).describe("Chủ đề bài dạy"),
        materials: z.array(z.string().min(1).max(80)).min(1).max(15).describe("Học liệu/đồ dùng cô có hoặc đã đồng ý dùng"),
        duration: z.number().min(5).max(45).describe("Thời lượng (phút); sẽ làm tròn về 15/20/25/30"),
        space: z.enum(["indoor", "outdoor"]).describe("Trong lớp hay ngoài sân"),
        stemEnabled: z.boolean().optional().describe("Tích hợp khám phá STEM"),
        folkGameEnabled: z.boolean().optional().describe("Tích hợp trò chơi dân gian"),
        classNotes: z.string().max(1000).optional().describe("Ý tưởng cô đã chọn và lưu ý riêng của cô"),
      }),
      responseFormat: "content_and_artifact",
    },
  );

  const rewritePlanSection = tool(
    guarded(async (args: { section: (typeof EDITABLE_SECTIONS)[number]; instruction?: string; planId?: string }) => {
      const target = await resolvePlan(args.planId);
      const plan = await services.lessonPlanner.rewriteSection(target.id, args.section, args.instruction, actor);
      return [
        `Đã viết lại phần "${args.section}" của "${plan.gameName}" (các phần khác giữ nguyên, phiên bản cũ được lưu lại).${plan.guardViolations.length ? ` Còn ${plan.guardViolations.length} điểm cần cô xem lại.` : ""}`,
        { kind: "plan", planId: plan.id, plan: toDTO(plan), violations: plan.guardViolations.map((v) => v.message) },
      ];
    }),
    {
      name: "rewrite_plan_section",
      description: "Nhờ AI viết lại DUY NHẤT một phần của giáo án theo góp ý của cô (tên, mục tiêu, chuẩn bị, cách chơi, lời dẫn, an toàn).",
      schema: z.object({
        section: z.enum(EDITABLE_SECTIONS),
        instruction: z.string().max(1000).optional().describe("Góp ý của cô về cách viết lại"),
        planId: planIdArg,
      }),
      responseFormat: "content_and_artifact",
    },
  );

  /** Không phê duyệt thay cô: chỉ chuẩn bị thẻ có nút xác nhận (Human-in-the-loop, chống prompt injection). */
  const approvePlan = tool(
    guarded(async (args: { planId?: string }) => {
      const plan = await resolvePlan(args.planId);
      if (plan.status === "approved" || plan.status === "shared") {
        return [`Giáo án "${plan.gameName}" đã được phê duyệt rồi.`, { kind: "plan", planId: plan.id, plan: toDTO(plan), violations: [] }];
      }
      const issues = blockingIssues(plan);
      if (issues.length) return notice(`Chưa thể phê duyệt "${plan.gameName}" vì còn vi phạm bắt buộc: ${issues.join("; ")}. Cô sửa tay hoặc nhờ mình viết lại phần liên quan nhé.`);
      return [
        `Giáo án "${plan.gameName}" đã sẵn sàng. Việc phê duyệt chỉ diễn ra khi cô bấm nút "Phê duyệt & Tạo checklist" trên thẻ.`,
        { kind: "plan", planId: plan.id, plan: toDTO(plan), violations: plan.guardViolations.map((v) => v.message), awaiting: "approve" },
      ];
    }),
    {
      name: "approve_plan",
      description: "Chuẩn bị phê duyệt giáo án: hiển thị thẻ để CÔ tự bấm xác nhận (công cụ không tự phê duyệt). Chỉ gọi khi cô nói rõ muốn phê duyệt.",
      schema: z.object({ planId: planIdArg }),
      responseFormat: "content_and_artifact",
    },
  );

  const generateChecklist = tool(
    guarded(async (args: { planId?: string }) => {
      const plan = await resolvePlan(args.planId);
      const { checklist, criteria } = await services.assessment.createChecklist(plan.id, actor);
      return [
        `Checklist quan sát của "${plan.gameName}" có ${criteria.length} tiêu chí. Cô có thể mở bảng đánh giá để tích chọn cả lớp.`,
        { kind: "checklist", planId: plan.id, gameName: plan.gameName ?? "", checklistId: checklist.id, criteria },
      ];
    }),
    {
      name: "generate_checklist",
      description: "Tạo (hoặc mở lại) checklist tiêu chí quan sát từ mục tiêu của giáo án đã được phê duyệt.",
      schema: z.object({ planId: planIdArg }),
      responseFormat: "content_and_artifact",
    },
  );

  const generateParentCard = tool(
    guarded(async (args: { planId?: string }) => {
      const plan = await resolvePlan(args.planId);
      const card = await services.parentCards.generate(plan.id, actor);
      return [
        `Thẻ nhiệm vụ cho phụ huynh đang ở trạng thái ${card.status === "sent" ? "đã gửi" : "bản nháp"}. Cô đọc lại; khi muốn gửi, cô bấm "Duyệt & Gửi cho phụ huynh" trên thẻ.`,
        { kind: "parent-card", cardId: card.id, planId: plan.id, status: card.status, content: card.content as never },
      ];
    }),
    {
      name: "generate_parent_card",
      description: "Soạn Thẻ nhiệm vụ cho phụ huynh từ giáo án đã phê duyệt (bản nháp; đã có thì mở lại bản hiện có).",
      schema: z.object({ planId: planIdArg }),
      responseFormat: "content_and_artifact",
    },
  );

  /** Không gửi thay cô: gửi tới phụ huynh là thao tác ra bên ngoài, chỉ xảy ra khi cô bấm nút trên thẻ. */
  const sendParentCard = tool(
    guarded(async (args: { planId?: string }) => {
      const plan = await resolvePlan(args.planId);
      const card = (await repos.parentCards.findByPlan(plan.id)) ?? (await services.parentCards.generate(plan.id, actor));
      if (card.status === "sent") {
        const stats = await services.parentCards.statsForActor(card.id, actor);
        const links = (await repos.parentCards.listTokens(card.id)).map((t) => ({ studentName: t.student.fullName, url: `/parent/${t.token}` }));
        return [`Thẻ của "${plan.gameName}" đã được gửi trước đó: ${stats.completed}/${stats.total} phụ huynh báo hoàn thành.`, { kind: "feedback-stats", cardId: card.id, stats, links }];
      }
      return [
        `Thẻ cho phụ huynh đã sẵn sàng. Thẻ chỉ được gửi khi cô bấm "Duyệt & Gửi cho phụ huynh" trên thẻ.`,
        { kind: "parent-card", cardId: card.id, planId: plan.id, status: card.status, content: card.content as never, awaiting: "send" },
      ];
    }),
    {
      name: "send_parent_card",
      description: "Chuẩn bị gửi thẻ cho phụ huynh: hiển thị thẻ để CÔ tự bấm gửi (công cụ không tự gửi). Chỉ gọi khi cô nói rõ muốn gửi; giáo án phải được phê duyệt.",
      schema: z.object({ planId: planIdArg }),
      responseFormat: "content_and_artifact",
    },
  );

  const getFeedbackStats = tool(
    guarded(async () => {
      const latest = await services.parentCards.latestForClass(actor.classId ?? "");
      if (!latest) return notice("Lớp mình chưa có thẻ nào được gửi cho phụ huynh.");
      const { stats } = latest;
      return [
        `Thẻ gần nhất: ${stats.completed}/${stats.total} phụ huynh đã báo hoàn thành (${stats.completionRate}%), ${stats.needsPractice} bé cần hỗ trợ thêm, ${stats.pending} chưa phản hồi.`,
        { kind: "feedback-stats", cardId: latest.card.id, stats, links: latest.links.map((l) => ({ studentName: l.studentName, url: l.url })) },
      ];
    }),
    {
      name: "get_parent_feedback_stats",
      description: "Xem tỷ lệ phụ huynh đã phản hồi/hoàn thành nhiệm vụ của thẻ gần nhất.",
      schema: z.object({}),
      responseFormat: "content_and_artifact",
    },
  );

  const analyzeClassBehavior = tool(
    guarded(async () => {
      const alerts = await services.assessment.listAlerts(actor.classId ?? "");
      if (alerts.length === 0) return ["Hiện chưa có bé nào có chuỗi nhiều tuần liên tiếp cần rèn thêm.", { kind: "alerts", alerts: [] }];
      return [
        `Có ${alerts.length} gợi ý quan sát sâu: ${alerts.map((a) => `${a.student.fullName} (${a.pattern})`).join("; ")}. Đây chỉ là gợi ý quan sát, không phải chẩn đoán.`,
        {
          kind: "alerts",
          alerts: alerts.map((a) => ({ id: a.id, studentId: a.studentId, studentName: a.student.fullName, pattern: a.pattern, weekCount: a.weekCount, skillArea: a.skillArea, suggestedActivity: a.suggestedActivity, disclaimer: a.disclaimer })),
        },
      ];
    }),
    {
      name: "analyze_class_behavior",
      description: "Xem các Gợi ý quan sát sâu hiện có (bé có nhiều tuần liên tiếp cần rèn thêm) kèm trò chơi hỗ trợ riêng. Không chẩn đoán.",
      schema: z.object({}),
      responseFormat: "content_and_artifact",
    },
  );

  const listRecentPlans = tool(
    guarded(async () => {
      const plans = await repos.lessonPlans.listByClass(actor.classId ?? "", 6);
      return [
        plans.length ? `Các giáo án gần đây: ${plans.map((p) => `"${p.gameName}" (planId=${p.id}, ${PLAN_STATUS_META[p.status].label})`).join("; ")}.` : "Lớp chưa có giáo án nào.",
        { kind: "plan-list", plans: plans.map((p) => ({ id: p.id, gameName: p.gameName, status: p.status, topic: p.topic, createdAt: p.createdAt.toISOString() })) },
      ];
    }),
    {
      name: "list_recent_plans",
      description: "Liệt kê các giáo án gần đây của lớp kèm trạng thái.",
      schema: z.object({}),
      responseFormat: "content_and_artifact",
    },
  );

  const childProfile = tool(
    guarded(async (args: { studentName: string }) => {
      const wanted = fold(args.studentName);
      const students = await repos.students.listByClass(actor.classId ?? "");
      const matches = students.filter((s) => fold(s.fullName).includes(wanted) || wanted.includes(fold(s.fullName)));
      if (matches.length === 0) return notice(`Mình không tìm thấy bé nào tên "${args.studentName}" trong lớp.`);
      if (matches.length > 1) return notice(`Có nhiều bé khớp tên "${args.studentName}": ${matches.map((m) => m.fullName).join(", ")}. Cô nói rõ họ tên giúp mình nhé.`);
      const [student] = matches;
      const view = await profiles.teacherView(actor, student.id);
      if (!view.shared) return notice(`Phụ huynh của bé ${student.fullName} chưa đồng ý chia sẻ hồ sơ cá nhân hóa với cô, nên mình chưa xem được.`);
      turn.tainted = true;
      const text = await profiles.profileForTeacher(student.id);
      return [
        fenceUntrusted(`hồ sơ bé ${student.fullName} do phụ huynh cung cấp`, text),
        { kind: "knowledge", tool: "get_child_profile", title: `Hồ sơ cá nhân hóa của bé ${student.fullName}`, items: view.memories.map((m) => ({ title: "Điều đã biết về bé", documentCode: "Phụ huynh đồng ý chia sẻ", content: m.content })) },
      ];
    }),
    {
      name: "get_child_profile",
      description: "Xem hồ sơ cá nhân hóa của MỘT bé trong lớp (sở thích, điều bé hợp) để thiết kế hoạt động riêng. Chỉ xem được khi phụ huynh đã đồng ý chia sẻ.",
      schema: z.object({ studentName: z.string().min(2).max(80).describe("Tên bé trong lớp") }),
      responseFormat: "content_and_artifact",
    },
  );

  const saveMemory = tool(
    guarded(async (args: { content: string }) => {
      if (turn.tainted) {
        return notice("Lượt này có dữ liệu từ hồ sơ phụ huynh nên mình chưa ghi nhớ gì (tránh ghi nhầm nội dung không phải của cô). Cô nhắn lại điều cần nhớ ở tin tiếp theo giúp mình nhé.");
      }
      const saved = await remember(args.content);
      return [`Đã ghi nhớ: "${saved}".`, { kind: "notice", tone: "info", message: `Đã ghi nhớ: ${saved}` }];
    }),
    {
      name: "save_memory",
      description: "Ghi nhớ dài hạn một điều bền vững CHÍNH CÔ vừa nói về lớp hoặc cách làm việc (không phải thông tin nhạy cảm của từng trẻ, không phải nhãn chẩn đoán).",
      schema: z.object({ content: z.string().min(3).max(300).describe("Một câu ngắn, rõ ràng") }),
      responseFormat: "content_and_artifact",
    },
  );

  return [childProfile, saveMemory, createLessonPlan, rewritePlanSection, approvePlan, generateChecklist, generateParentCard, sendParentCard, getFeedbackStats, analyzeClassBehavior, listRecentPlans];
}
