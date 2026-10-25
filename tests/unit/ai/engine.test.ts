import { describe, it, expect, vi } from "vitest";
import { fakeModel } from "@langchain/core/testing";
import { createLangChainEngine, type PlanningContext } from "@/ai/engine";
import { createKnowledgeRetriever } from "@/ai/rag/retriever";
import type { Judge } from "@/ai/quality/refine";
import { HashEmbeddings } from "../../helpers/hash-embeddings";
import { sampleLessonPlan } from "../../fixtures/lesson-plan";
import type { CreatePlanInput } from "@/core/schemas/form-inputs.schema";

const retriever = createKnowledgeRetriever({ embeddings: new HashEmbeddings() });
const input: CreatePlanInput = {
  ageGroup: "4-5y",
  developmentArea: "social-emotional",
  topic: "Bản thân & Tình bạn",
  materials: ["Vỏ hộp sữa tái chế", "Rổ nhựa", "Bóng nhựa nhỏ"],
  duration: 20,
  space: "indoor",
  stemEnabled: true,
  folkGameEnabled: true,
};
const context: PlanningContext = { className: "Lớp B1", teacherMemories: ["Lớp có 2 bé dị ứng sữa"], recentPlans: [] };
const passJudge: Judge = async ({ criteria }) => criteria.map((c) => ({ id: c.id, passed: true }));

describe("LangChain engine (structured output + vòng tiêu chí; model là test double)", () => {
  it("đạt tiêu chí ngay: 1 lượt sinh, báo đúng các bước thật của pipeline", async () => {
    const model = fakeModel().structuredResponse(sampleLessonPlan);
    const engine = createLangChainEngine({ getModel: () => model, retriever, judge: passJudge });
    const steps: string[] = [];
    const { value, review } = await engine.generateLessonPlan(input, context, { onStep: (s) => steps.push(s) });
    expect(value.gameName).toBe(sampleLessonPlan.gameName);
    expect(review).toMatchObject({ passed: true, rounds: 1 });
    expect(steps).toEqual(["legal", "safety", "generate", "review"]);
  });

  it("bộ chấm báo chưa đạt → AI được gọi lại để tự sửa (prompt lần 2 chứa YÊU CẦU SỬA và nhận xét)", async () => {
    const prompts: string[] = [];
    const model = fakeModel().structuredResponse(sampleLessonPlan);
    const getModel = () => {
      const original = model.withStructuredOutput.bind(model);
      return Object.assign(Object.create(model), {
        withStructuredOutput: (...args: Parameters<typeof original>) => {
          const runnable = original(...args);
          return { invoke: async (p: string) => (prompts.push(p), runnable.invoke(p)) };
        },
      });
    };
    let calls = 0;
    const judge: Judge = async ({ criteria }) => criteria.map((c) => ({ id: c.id, passed: !(c.id === "loi-dan" && calls++ === 0), issue: "Lời dẫn chưa gợi tưởng tượng" }));
    const engine = createLangChainEngine({ getModel, retriever, judge, maxRevisions: 2 });
    const steps: string[] = [];
    const { review } = await engine.generateLessonPlan(input, context, { onStep: (s) => steps.push(s) });
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).not.toContain("YÊU CẦU SỬA");
    expect(prompts[1]).toContain("YÊU CẦU SỬA");
    expect(prompts[1]).toContain("[loi-dan] Lời dẫn chưa gợi tưởng tượng");
    expect(review).toMatchObject({ passed: true, rounds: 2, findings: [] });
    expect(steps).toEqual(["legal", "safety", "generate", "review", "revise", "review"]);
  });

  it("prompt chứa bối cảnh thật của lớp (trí nhớ của cô được rào như dữ liệu) và tiêu chí đánh giá, không có khuôn mẫu cứng", async () => {
    const prompts: string[] = [];
    const model = fakeModel().structuredResponse(sampleLessonPlan);
    const spy = vi.spyOn(model, "withStructuredOutput");
    spy.mockImplementation(() => ({ invoke: async (p: string) => (prompts.push(p), sampleLessonPlan) }) as never);
    const engine = createLangChainEngine({ getModel: () => model, retriever, judge: passJudge });
    await engine.generateLessonPlan(input, { ...context, recentPlans: [{ gameName: "Tàu lửa tí hon", topic: "Giao thông", developmentArea: "physical" }] });
    expect(prompts[0]).toContain("«DỮ LIỆU trí nhớ dài hạn»");
    expect(prompts[0]).toContain("Lớp có 2 bé dị ứng sữa");
    expect(prompts[0]).toContain('"Tàu lửa tí hon"');
    expect(prompts[0]).toContain("TIÊU CHÍ ĐÁNH GIÁ");
    expect(prompts[0]).not.toMatch(/MỞ ĐẦU:|THẮT NÚT|CAO TRÀO/);
  });

  it("ném lỗi khi output không đúng schema (không nuốt lỗi)", async () => {
    const model = fakeModel().structuredResponse({ gameName: "thiếu hết các trường khác" });
    const engine = createLangChainEngine({ getModel: () => model, retriever, judge: passJudge });
    await expect(engine.generateLessonPlan(input, context)).rejects.toThrow();
  });

  it("structured output lần 1 sai schema → sửa lại 1 lần bằng lỗi Zod rồi thành công (P1-02)", async () => {
    const prompts: string[] = [];
    const model = fakeModel().structuredResponse(sampleLessonPlan);
    const getModel = () => {
      let calls = 0;
      return Object.assign(Object.create(model), {
        withStructuredOutput: () => ({
          invoke: async (p: string) => {
            prompts.push(p);
            calls += 1;
            return calls === 1 ? { gameName: "thiếu hết các trường khác" } : sampleLessonPlan;
          },
        }),
      });
    };
    const engine = createLangChainEngine({ getModel, retriever, judge: passJudge });
    const { value, review } = await engine.generateLessonPlan(input, context);
    expect(value.gameName).toBe(sampleLessonPlan.gameName);
    expect(review.passed).toBe(true);
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain("SAI ĐỊNH DẠNG");
  });

  it("hoạt động ở nhà: bộ chấm lỗi → fail-closed, passed=false dù nội dung đạt (P1-01)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const activity = { title: "Đếm hộp sữa", minutes: 5, whyForThisChild: "Bé thích đếm", materials: ["Vỏ hộp sữa tái chế"], steps: ["Cùng con đếm vỏ hộp"], eqQuestion: "Con thích gì?", parentTip: "Bố mẹ giám sát sát sao" };
    const model = fakeModel().structuredResponse(activity);
    const failingJudge: Judge = async () => Promise.reject(new Error("timeout"));
    const engine = createLangChainEngine({ getModel: () => model, retriever, judge: failingJudge });
    const { review } = await engine.generateHomeActivity({ profile: "Bé thích đếm", minutes: 5, ageGroup: "4-5y" });
    expect(review.passed).toBe(false);
    expect(review.judged).toBe(false);
    expect(review.findings.map((f) => f.criterionId)).toContain("judge-unavailable");
    spy.mockRestore();
  });

  it("checklist: structured output + chấm theo tiêu chí", async () => {
    const model = fakeModel().structuredResponse({ criteria: ["a", "b", "c"] });
    const engine = createLangChainEngine({ getModel: () => model, retriever, judge: passJudge });
    expect(await engine.generateChecklist(sampleLessonPlan)).toMatchObject({ value: ["a", "b", "c"], review: { passed: true } });
  });

  it("viết lại một phần: trả đúng giá trị phần đó, kiểm tra tiêu chí trên cả giáo án sau khi ghép", async () => {
    const model = fakeModel().structuredResponse({ value: "Lời dẫn mới ấm áp" });
    const engine = createLangChainEngine({ getModel: () => model, retriever, judge: passJudge });
    const r = await engine.rewriteSection({ plan: sampleLessonPlan, section: "teacherScript", materials: ["Vỏ hộp sữa"], ageGroup: "4-5y", duration: 20 });
    expect(r.value).toBe("Lời dẫn mới ấm áp");
    expect(r.review.passed).toBe(true);
  });
});
