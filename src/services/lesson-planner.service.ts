import type { z } from "zod";
import { assertCan, checkLanguage, checkSafetyCoverage, checkScreenFree, finalizePlanOutput, verifyCitation, type Violation } from "@/core/guardrails";
import { sanitizeDeep } from "@/core/guardrails/language-guard";
import { FlowError, NotFoundError } from "@/core/errors";
import { createPlanInputSchema } from "@/core/schemas/form-inputs.schema";
import { sectionSchemas, type EditableSection, type LessonPlanOutput } from "@/core/schemas/lesson-plan.schema";
import type { GenerationStep, PlanningContext } from "@/ai/engine";
import type { Finding, Review } from "@/ai/quality/rubric";
import { collectStrings } from "@/ai/quality/rubrics";
import type { PlanRecord } from "@/data/repositories";
import type { Actor, ServiceDeps } from "./types";
import type { AuditService } from "./audit.service";
import { assertClassAccess, requireClass } from "./access";

/** PlanRecord → nội dung sinh bởi AI (đưa lại vào engine khi viết lại một phần) */
export function toPlanContent(p: PlanRecord): LessonPlanOutput {
  return {
    gameName: p.gameName ?? "",
    legalReference: p.legalReference ?? { documentCode: "", relevantSection: "", summary: "", isVerified: false },
    safetyWarnings: p.safetyWarnings,
    objectives: p.objectives,
    preparation: p.preparation,
    procedure: p.procedure,
    teacherScript: p.teacherScript ?? "",
    flashcards: p.flashcards,
    observationCriteria: p.observationCriteria,
    eqQuestions: p.eqQuestions,
  };
}

const RULE_OF: Record<string, Violation["rule"]> = { "an-toan-vat-lieu": "BR-002", "can-cu-phap-ly": "BR-003", "ngon-ngu-trung-lap": "BR-004", "screen-free": "BR-005" };

/** Kết quả chấm → danh sách hiển thị cho cô (vi phạm bắt buộc trước, tiêu chí chất lượng chưa đạt sau). */
export function reviewToViolations(review: Pick<Review, "findings">, corrections: Violation[] = []): Violation[] {
  const order = (f: Finding) => (f.severity === "blocking" ? 0 : 1);
  return [
    ...[...review.findings].sort((a, b) => order(a) - order(b)).map((f) => ({
      rule: f.rule ?? RULE_OF[f.criterionId] ?? ("BR-001" as const),
      message: `${f.severity === "blocking" ? "Bắt buộc" : "Cần xem lại"} [${f.criterionId}]: ${f.issues.join("; ")}`,
    })),
    ...corrections,
  ];
}

/**
 * Kiểm tra tất định các luật BẮT BUỘC trên nội dung HIỆN TẠI của giáo án (sau mọi lần cô sửa tay).
 * Dùng làm cổng phê duyệt: AI không được "lách" bằng cách để cô duyệt bản còn vi phạm.
 */
export function blockingIssues(plan: PlanRecord): string[] {
  const content = toPlanContent(plan);
  const childFacing = [content.teacherScript, ...content.preparation, ...content.procedure.map((s) => `${s.title}. ${s.instructions}`), ...content.flashcards.map((f) => f.text)];
  return [
    ...checkSafetyCoverage(content.safetyWarnings, plan.materials, plan.ageGroup),
    ...checkScreenFree(childFacing.join("\n")).violations,
    ...checkLanguage(collectStrings(content).join("\n")).violations,
    ...(content.legalReference.isVerified && !verifyCitation(content.legalReference).isVerified ? ["Căn cứ pháp lý không có trong kho tri thức"] : []),
  ];
}

export function createLessonPlannerService({ repos, engine }: ServiceDeps, audit: AuditService) {
  const get = async (id: string): Promise<PlanRecord> => {
    const plan = await repos.lessonPlans.findById(id);
    if (!plan) throw new NotFoundError("giáo án");
    return plan;
  };

  /** Đọc có phân quyền (giáo viên: lớp mình; BGH: trường mình). Mọi API đọc giáo án phải đi qua hàm này. */
  const getForActor = async (id: string, actor: Actor): Promise<PlanRecord> => {
    assertCan(actor.role, "plan:read");
    const plan = await get(id);
    await assertClassAccess(repos, actor, plan.classId);
    return plan;
  };

  /** Bối cảnh thật của lớp cho AI: trí nhớ của cô + các trò chơi gần đây (để không lặp lại, nối tiếp mạch học). */
  const planningContext = async (actor: Actor, classId: string): Promise<PlanningContext> => {
    const [memories, recent, cls] = await Promise.all([repos.memories.list(actor.id), repos.lessonPlans.listByClass(classId, 8), repos.users.findClass(classId)]);
    return {
      className: cls?.name,
      teacherMemories: memories.map((m) => m.content),
      recentPlans: recent.map((p) => ({ gameName: p.gameName, topic: p.topic, developmentArea: p.developmentArea })),
    };
  };

  const writeSection = async (plan: PlanRecord, section: EditableSection, value: unknown, actor: Actor, description: string, violations?: Violation[]) => {
    const parsed = sectionSchemas[section].parse({ value });
    const clean = sanitizeDeep(parsed.value);
    const updated = await repos.lessonPlans.updateSection(plan.id, section, clean.value, actor.id, description, violations);
    // Sửa sau khi đã duyệt thì phải duyệt lại (Human-in-the-loop)
    return plan.status === "approved" || plan.status === "needs_review" ? repos.lessonPlans.setStatus(plan.id, "ai_draft") : updated;
  };

  const editable = async (planId: string, actor: Actor) => {
    assertCan(actor.role, "plan:write");
    const plan = await get(planId);
    await assertClassAccess(repos, actor, plan.classId);
    if (plan.status === "shared") throw new FlowError("Giáo án đã chia sẻ cho phụ huynh nên không thể chỉnh sửa");
    return plan;
  };

  return {
    get,
    getForActor,

    /** Soạn giáo án: bối cảnh lớp → RAG + AI → chấm theo tiêu chí, AI tự sửa → lưới an toàn cuối → lưu bản nháp (BR-001). */
    async create(rawInput: z.input<typeof createPlanInputSchema>, actor: Actor, options?: { onStep?: (step: GenerationStep) => void }) {
      assertCan(actor.role, "plan:write");
      const input = createPlanInputSchema.parse(rawInput);
      const classId = requireClass(actor);

      const generated = await engine.generateLessonPlan(input, await planningContext(actor, classId), options);
      const { plan: content, corrections } = finalizePlanOutput(generated.value);
      const violations = reviewToViolations(generated.review, corrections);
      const plan = await repos.lessonPlans.create({ classId, teacherId: actor.id, input, content, violations });

      await audit.log({
        userId: actor.id,
        action: "create_plan",
        target: plan.id,
        details: `${generated.review.rounds} lượt sinh; ${generated.review.passed ? "đạt tiêu chí bắt buộc" : "CÒN vi phạm bắt buộc"}${violations.length ? `; ${violations.length} điểm cần xem lại` : ""}`,
      });
      return { plan, violations, review: generated.review };
    },

    listForClass: (classId: string, limit = 20) => repos.lessonPlans.listByClass(classId, limit),

    async versions(planId: string, actor: Actor) {
      await getForActor(planId, actor);
      return repos.lessonPlans.listVersions(planId);
    },

    /** Cô sửa tay một phần (Màn hình 4) -> ghi PlanVersion. */
    async editSection(planId: string, section: EditableSection, value: unknown, actor: Actor) {
      const plan = await editable(planId, actor);
      return writeSection(plan, section, value, actor, `Cô chỉnh sửa phần ${section}`);
    },

    async rewriteSection(planId: string, section: EditableSection, instruction: string | undefined, actor: Actor) {
      const plan = await editable(planId, actor);
      const recent = await repos.lessonPlans.listByClass(plan.classId, 8);
      const result = await engine.rewriteSection({
        plan: toPlanContent(plan),
        section,
        instruction,
        materials: plan.materials,
        ageGroup: plan.ageGroup,
        duration: plan.duration,
        recentGameNames: recent.filter((p) => p.id !== plan.id).map((p) => p.gameName ?? "").filter(Boolean),
      });
      return writeSection(plan, section, result.value, actor, `AI viết lại phần ${section}${instruction ? `: ${instruction.slice(0, 200)}` : ""}`, reviewToViolations(result.review));
    },

    async submitForReview(planId: string, actor: Actor) {
      const plan = await editable(planId, actor);
      const issues = blockingIssues(plan);
      if (issues.length) throw new FlowError(`Giáo án còn vi phạm bắt buộc, cô sửa trước khi gửi duyệt: ${issues.join("; ")}`);
      const updated = await repos.lessonPlans.setStatus(planId, "needs_review");
      await audit.log({ userId: actor.id, action: "submit_review", target: planId });
      return updated;
    },

    /**
     * Phê duyệt cấp lớp (giáo viên) hoặc cấp trường (BGH). Idempotent.
     * Cổng an toàn: còn vi phạm luật bắt buộc (an toàn, screen-free, ngôn ngữ, căn cứ) thì không cho duyệt.
     */
    async approve(planId: string, actor: Actor) {
      assertCan(actor.role, "plan:approve");
      const plan = await get(planId);
      await assertClassAccess(repos, actor, plan.classId);
      if (plan.status === "approved" || plan.status === "shared") return plan;
      const issues = blockingIssues(plan);
      if (issues.length) throw new FlowError(`Chưa thể phê duyệt vì giáo án còn vi phạm bắt buộc: ${issues.join("; ")}. Cô sửa tay hoặc nhờ AI viết lại phần liên quan.`);
      const updated = await repos.lessonPlans.setStatus(planId, "approved", actor.id);
      await audit.log({ userId: actor.id, action: "approve_plan", target: planId });
      return updated;
    },

    /** Chỉ BGH: yêu cầu sửa lại, đưa bài về "Bản nháp" để giáo viên chỉnh. */
    async requestChanges(planId: string, actor: Actor) {
      if (actor.role !== "principal") throw new FlowError("Chỉ Ban giám hiệu mới yêu cầu sửa lại giáo án");
      const plan = await get(planId);
      await assertClassAccess(repos, actor, plan.classId);
      if (plan.status === "shared") throw new FlowError("Giáo án đã chia sẻ cho phụ huynh");
      // trả về giáo viên (rời hàng chờ duyệt của BGH) thay vì giữ "Cần rà soát" như trước
      const updated = await repos.lessonPlans.setStatus(planId, "ai_draft");
      await audit.log({ userId: actor.id, action: "request_changes", target: planId });
      return updated;
    },
  };
}
export type LessonPlannerService = ReturnType<typeof createLessonPlannerService>;
