import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { z } from "zod";
import { getAgeLabel } from "@/core/constants/age-groups";
import { getAreaLabel } from "@/core/constants/development-areas";
import type { CreatePlanInput } from "@/core/schemas/form-inputs.schema";
import { lessonPlanOutputSchema, sectionSchemas, type EditableSection, type LessonPlanOutput } from "@/core/schemas/lesson-plan.schema";
import { behaviorAnalysisOutputSchema, checklistOutputSchema, type BehaviorAnalysisOutput } from "@/core/schemas/assessment.schema";
import { parentCardContentSchema, type ParentCardContent } from "@/core/schemas/parent-card.schema";
import { homeActivitySchema, type HomeActivity } from "@/core/schemas/family.schema";
import { composeHomeActivityPrompt } from "./prompts/home-activity.prompt";
import { composeLessonPlannerPrompt, type PlanningContext } from "./prompts/lesson-planner.prompt";
import { composeChecklistPrompt } from "./prompts/checklist-generator.prompt";
import { composeParentCardPrompt, type ParentCardPromptArgs } from "./prompts/parent-card-writer.prompt";
import { composeBehaviorPrompt, type BehaviorPromptArgs } from "./prompts/behavior-analyzer.prompt";
import { composeSectionRewritePrompt } from "./prompts/section-rewriter.prompt";
import { fenceUntrusted } from "./prompts/_shared/untrusted";
import { getKnowledgeRetriever, type KnowledgeRetriever, type RetrievedChunk } from "./rag/retriever";
import { routeModel, type TaskType } from "./model-router";
import { resolveMaxRevisions } from "./config";
import { createLlmJudge } from "./quality/judge";
import { generateWithRubric, type Judge } from "./quality/refine";
import type { Review } from "./quality/rubric";
import { behaviorRubric, checklistRubric, homeActivityRubric, lessonPlanRubric, parentCardRubric, sectionRewriteRubric } from "./quality/rubrics";

export type { PlanningContext } from "./prompts/lesson-planner.prompt";

/** Tiến trình thật của một lần soạn (đẩy lên UI qua stream). */
export type GenerationStep = "legal" | "safety" | "generate" | "review" | "revise";
export interface GenerateOptions {
  onStep?: (step: GenerationStep) => void;
}

/** Đầu ra của AI kèm kết quả chấm theo tiêu chí (để lưu, hiển thị và chặn phê duyệt khi còn vi phạm bắt buộc). */
export interface Generated<T> {
  value: T;
  review: Review;
}

export type PlanContent = ParentCardPromptArgs["plan"];

/** Hợp đồng của nhân AI; cài đặt thật là createLangChainEngine (test dùng test double). */
export interface AiEngine {
  generateLessonPlan(input: CreatePlanInput, context: PlanningContext, options?: GenerateOptions): Promise<Generated<LessonPlanOutput>>;
  rewriteSection(args: {
    plan: LessonPlanOutput;
    section: EditableSection;
    instruction?: string;
    materials: string[];
    ageGroup: string;
    duration: number;
    recentGameNames?: string[];
  }): Promise<Generated<unknown>>;
  generateChecklist(plan: Pick<LessonPlanOutput, "gameName" | "objectives">): Promise<Generated<string[]>>;
  generateParentCard(args: Omit<ParentCardPromptArgs, "revision">): Promise<Generated<ParentCardContent>>;
  analyzeBehavior(args: Omit<BehaviorPromptArgs, "revision">): Promise<Generated<BehaviorAnalysisOutput>>;
  /** Hoạt động ở nhà cá nhân hóa theo hồ sơ của bé (phụ huynh dẫn dắt). */
  generateHomeActivity(args: { profile: string; focus?: string; minutes?: number; ageGroup?: string }): Promise<Generated<HomeActivity>>;
}

const format = (hits: RetrievedChunk[]) => hits.map((h) => `- [${h.metadata.documentCode} · ${h.metadata.section}] ${h.content}`).join("\n");

export interface LangChainEngineDeps {
  getModel: (task: TaskType) => BaseChatModel;
  retriever: KnowledgeRetriever;
  /** Bộ chấm định tính; mặc định dùng mô hình "evaluation" */
  judge?: Judge;
  maxRevisions?: number;
}

export function createLangChainEngine({ getModel, retriever, judge, maxRevisions = 2 }: LangChainEngineDeps): AiEngine {
  const reviewer = judge ?? createLlmJudge(() => getModel("evaluation"));
  const structured = <S extends z.ZodType>(task: TaskType, schema: S, name: string) => {
    const model = getModel(task).withStructuredOutput(schema as never, { name, method: "functionCalling" });
    return async (prompt: string): Promise<z.output<S>> => schema.parse(await model.invoke(prompt));
  };

  return {
    async generateLessonPlan(input, context, options) {
      options?.onStep?.("legal");
      const query = `${getAreaLabel(input.developmentArea)} ${getAgeLabel(input.ageGroup)} ${input.topic}`;
      const legal = await retriever.retrieve({ query, collection: "vbhn01", topK: 5, filter: { ageGroup: input.ageGroup } });
      const extras = [
        input.folkGameEnabled && (await retriever.retrieve({ query: input.topic, collection: "folklore", topK: 2 })),
        input.stemEnabled && (await retriever.retrieve({ query: input.materials.join(" "), collection: "stem", topK: 2 })),
      ].flatMap((x) => x || []);

      options?.onStep?.("safety");
      const safety = await retriever.retrieve({ query: `${input.materials.join(" ")} ${getAgeLabel(input.ageGroup)} ${input.space === "outdoor" ? "ngoài trời" : "trong lớp"} vận động`, collection: "tt45-safety", topK: 4 });

      const run = structured("creative-generation", lessonPlanOutputSchema, "lesson_plan");
      const prompt = (revision?: { previous: LessonPlanOutput; findings: Review["findings"] }) =>
        composeLessonPlannerPrompt({ input, context, legalContext: format(legal), safetyContext: format(safety), extraContext: format(extras), revision });

      return generateWithRubric({
        rubric: lessonPlanRubric,
        ctx: { ageGroup: input.ageGroup, materials: input.materials, duration: input.duration, recentGameNames: context.recentPlans.map((p) => p.gameName ?? "").filter(Boolean) },
        generate: (revision) => run(prompt(revision)),
        judge: reviewer,
        judgeContext: [
          `Độ tuổi ${getAgeLabel(input.ageGroup)}; mảng ${getAreaLabel(input.developmentArea)}; chủ đề "${input.topic}"; học liệu: ${input.materials.join(", ")}; ${input.duration} phút; ${input.space === "indoor" ? "trong lớp" : "ngoài sân"}.`,
          input.stemEnabled ? "Cô muốn tích hợp STEM." : "",
          input.folkGameEnabled ? "Cô muốn lồng trò chơi dân gian." : "",
          input.classNotes ? fenceUntrusted("lưu ý của cô", input.classNotes) : "",
          context.teacherMemories.length ? fenceUntrusted("trí nhớ dài hạn của cô", context.teacherMemories) : "",
          legal.length ? `Căn cứ đã tra cứu:\n${format(legal)}` : "Không có căn cứ pháp lý phù hợp trong kho tri thức.",
        ]
          .filter(Boolean)
          .join("\n"),
        maxRevisions,
        onPhase: (phase) => options?.onStep?.(phase === "evaluate" ? "review" : phase),
      });
    },

    async rewriteSection({ plan, section, instruction, materials, ageGroup, duration, recentGameNames = [] }) {
      const schema = sectionSchemas[section] as z.ZodType<{ value: unknown }>;
      const run = structured("rewrite", schema, `rewrite_${section}`);
      const result = await generateWithRubric({
        rubric: sectionRewriteRubric,
        ctx: { ageGroup, materials, duration, recentGameNames },
        generate: async (revision) => {
          const prompt = composeSectionRewritePrompt({
            section,
            plan,
            instruction,
            materials,
            ageGroup,
            duration,
            revision: revision && { previous: revision.previous[section], findings: revision.findings },
          });
          return { ...plan, [section]: (await run(prompt)).value } as LessonPlanOutput;
        },
        judge: reviewer,
        judgeContext: `Phần được viết lại: ${section}. ${instruction ? fenceUntrusted("góp ý của cô", instruction) : "Cô không nêu góp ý cụ thể."}`,
        maxRevisions,
      });
      return { value: result.value[section], review: result.review };
    },

    async generateChecklist(plan) {
      const run = structured("extraction", checklistOutputSchema, "observation_checklist");
      return generateWithRubric({
        rubric: checklistRubric,
        ctx: { objectives: plan.objectives },
        generate: async (revision) => (await run(composeChecklistPrompt(plan, revision))).criteria,
        judge: reviewer,
        judgeContext: `Trò chơi "${plan.gameName}". Mục tiêu:\n${plan.objectives.map((o) => `- ${o}`).join("\n")}`,
        maxRevisions,
      });
    },

    async generateParentCard(args) {
      const run = structured("summarization", parentCardContentSchema, "parent_card");
      return generateWithRubric({
        rubric: parentCardRubric,
        ctx: undefined,
        generate: (revision) => run(composeParentCardPrompt({ ...args, revision })),
        judge: reviewer,
        judgeContext: `Bài học "${args.plan.gameName}". Mục tiêu:\n${args.plan.objectives.map((o) => `- ${o}`).join("\n")}\nLời dẫn ở lớp: ${args.plan.teacherScript}`,
        maxRevisions,
      });
    },

    async generateHomeActivity(args) {
      const minutes = args.minutes ?? 5;
      const run = structured("personalization", homeActivitySchema, "home_activity");
      return generateWithRubric({
        rubric: homeActivityRubric,
        ctx: { ageGroup: args.ageGroup, minutes },
        generate: (revision) => run(composeHomeActivityPrompt({ profile: args.profile, focus: args.focus, minutes, revision })),
        judge: reviewer,
        judgeContext: [fenceUntrusted("hồ sơ của bé", args.profile), args.focus ? fenceUntrusted("yêu cầu của bố mẹ", args.focus) : "Bố mẹ không nêu yêu cầu cụ thể.", `Thời gian: khoảng ${minutes} phút.`].join("\n"),
        maxRevisions,
      });
    },

    async analyzeBehavior(args) {
      const run = structured("analysis", behaviorAnalysisOutputSchema, "behavior_analysis");
      return generateWithRubric({
        rubric: behaviorRubric,
        ctx: undefined,
        generate: (revision) => run(composeBehaviorPrompt({ ...args, revision })),
        judge: reviewer,
        judgeContext: [
          `Bé có ${args.weekCount} tuần liên tiếp cần rèn thêm.`,
          `Tiêu chí của bài:\n${args.criteria.map((c) => `- ${c}`).join("\n")}`,
          `Tiêu chí bé còn cần rèn: ${args.weakCriteria.join("; ") || "(không rõ)"}`,
          args.notes.length ? fenceUntrusted("ghi chú của cô", args.notes) : "Không có ghi chú.",
        ].join("\n"),
        maxRevisions,
      });
    },
  };
}

/** Engine thật: LangChain + OpenAI (withStructuredOutput) + RAG + vòng tiêu chí đánh giá. */
export function createAiEngine(): AiEngine {
  return createLangChainEngine({ getModel: (task) => routeModel(task), retriever: getKnowledgeRetriever(), maxRevisions: resolveMaxRevisions() });
}
