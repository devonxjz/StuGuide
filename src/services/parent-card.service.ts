import { assertCan, checkLanguage } from "@/core/guardrails";
import { sanitizeDeep } from "@/core/guardrails/language-guard";
import { FlowError, NotFoundError } from "@/core/errors";
import { parentCardEditSchema, type ParentCardContent } from "@/core/schemas/parent-card.schema";
import { collectStrings } from "@/ai/quality/rubrics";
import type { Actor, FeedbackStats, ServiceDeps } from "./types";
import type { AuditService } from "./audit.service";
import type { LessonPlannerService } from "./lesson-planner.service";
import { assertClassAccess } from "./access";

const NOT_APPROVED = "Vui lòng rà soát và Phê duyệt kế hoạch trước khi gửi cho phụ huynh";

export function createParentCardService({ repos, engine }: ServiceDeps, audit: AuditService, planner: LessonPlannerService) {
  const getCard = async (cardId: string) => {
    const card = await repos.parentCards.findById(cardId);
    if (!card) throw new NotFoundError("thẻ phụ huynh");
    return card;
  };

  /** Đọc thẻ có phân quyền: giáo viên lớp đó hoặc BGH cùng trường. */
  const getForActor = async (cardId: string, actor: Actor) => {
    assertCan(actor.role, "card:read");
    const card = await getCard(cardId);
    await assertClassAccess(repos, actor, card.classId);
    return card;
  };

  const stats = async (cardId: string): Promise<FeedbackStats> => {
    const [tokens, feedbacks] = await Promise.all([repos.parentCards.listTokens(cardId), repos.parentCards.listFeedbacks(cardId)]);
    const byStudent = new Map(feedbacks.map((f) => [f.studentId, f.response]));
    // một bé có thể có nhiều phụ huynh (nhiều token): đếm theo bé
    const students = [...new Map(tokens.map((t) => [t.studentId, t.student.fullName])).entries()];
    const names = (pred: (r: string | undefined) => boolean) => students.filter(([id]) => pred(byStudent.get(id))).map(([, name]) => name);
    const completed = names((r) => r === "completed");
    const needsSupport = names((r) => r === "needs_practice");
    const pending = names((r) => r === undefined);
    return {
      total: students.length,
      completed: completed.length,
      needsPractice: needsSupport.length,
      pending: pending.length,
      completionRate: students.length ? Math.round((completed.length / students.length) * 100) : 0,
      completedStudents: completed,
      needsSupportStudents: needsSupport,
      pendingStudents: pending,
    };
  };

  return {
    /** Thống kê nội bộ (đã kiểm quyền ở nơi gọi, vd. sau khi phụ huynh phản hồi). */
    stats,
    getForActor,

    /** Thống kê có phân quyền (API của cô/BGH): chứa họ tên học sinh nên không được lộ sang lớp khác. */
    async statsForActor(cardId: string, actor: Actor) {
      await getForActor(cardId, actor);
      return stats(cardId);
    },

    /** AI tóm tắt bài học thành thẻ nhiệm vụ cho phụ huynh. Chỉ khi giáo án đã được duyệt (BR-001). */
    async generate(planId: string, actor: Actor) {
      assertCan(actor.role, "card:write");
      const plan = await planner.get(planId);
      await assertClassAccess(repos, actor, plan.classId);
      if (plan.status !== "approved" && plan.status !== "shared") throw new FlowError(NOT_APPROVED);

      const existing = await repos.parentCards.findByPlan(planId);
      if (existing) return existing; // giữ bản cô đã chỉnh; muốn soạn lại thì sửa trực tiếp trên thẻ

      const [teacher, cls] = await Promise.all([repos.users.findById(plan.teacherId), repos.users.findClass(plan.classId)]);
      const generated = await engine.generateParentCard({
        plan: { gameName: plan.gameName ?? "", objectives: plan.objectives, teacherScript: plan.teacherScript ?? "", eqQuestions: plan.eqQuestions, observationCriteria: plan.observationCriteria },
        teacherName: teacher?.fullName ?? "",
        className: cls?.name ?? "",
      });
      const content = sanitizeDeep(generated.value).value;
      const card = await repos.parentCards.create({ lessonPlanId: planId, classId: plan.classId, content });
      await audit.log({ userId: actor.id, action: "create_card", target: card.id, details: `${generated.review.rounds} lượt sinh; ${generated.review.findings.length} tiêu chí cần xem lại` });
      return card;
    },

    async updateContent(cardId: string, rawContent: unknown, actor: Actor) {
      assertCan(actor.role, "card:write");
      const card = await getCard(cardId);
      await assertClassAccess(repos, actor, card.classId);
      if (card.status === "sent") throw new FlowError("Thẻ đã gửi, không thể chỉnh sửa");
      const content: ParentCardContent = sanitizeDeep(parentCardEditSchema.parse(rawContent)).value;
      return repos.parentCards.updateContent(cardId, content);
    },

    /** Duyệt & gửi (chỉ khi cô bấm nút): tạo token riêng cho từng phụ huynh của lớp, đưa bài sang "Đã chia sẻ". */
    async send(cardId: string, actor: Actor) {
      assertCan(actor.role, "card:write");
      const card = await getCard(cardId);
      await assertClassAccess(repos, actor, card.classId);
      if (card.lessonPlan.status !== "approved" && card.lessonPlan.status !== "shared") throw new FlowError(NOT_APPROVED);
      const language = checkLanguage(collectStrings(card.content).join("\n"));
      if (!language.passed) throw new FlowError(`Thẻ còn từ ngữ không phù hợp, cô sửa trước khi gửi: ${language.violations.join("; ")}`);

      const tokens = await repos.parentCards.markSent(cardId, await repos.students.parentLinks(card.classId));
      await repos.lessonPlans.setStatus(card.lessonPlanId, "shared");
      await audit.log({ userId: actor.id, action: "send_card", target: cardId, details: `${tokens.length} liên kết` });
      return {
        card: await getCard(cardId),
        links: tokens.map((t) => ({ token: t.token, studentId: t.studentId, studentName: t.student.fullName, url: `/parent/${t.token}` })),
      };
    },

    async latestForClass(classId: string) {
      const card = await repos.parentCards.findLatestByClass(classId);
      if (!card) return null;
      const links = (await repos.parentCards.listTokens(card.id)).map((t) => ({
        token: t.token,
        studentId: t.studentId,
        studentName: t.student.fullName,
        url: `/parent/${t.token}`,
      }));
      return { card, stats: await stats(card.id), links };
    },
  };
}
export type ParentCardService = ReturnType<typeof createParentCardService>;
