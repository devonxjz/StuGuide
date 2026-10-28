import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { parseWithRepair } from "@/ai/structured-repair";
import { createLlmJudge } from "@/ai/quality/judge";
import { createChildDistiller } from "@/ai/memory/child-distiller";

const schema = z.object({ name: z.string(), count: z.number() });

/** Model giả: withStructuredOutput trả về các giá trị theo thứ tự gọi. */
const stubModel = (values: unknown[]) => {
  let calls = 0;
  const prompts: string[] = [];
  return {
    prompts,
    model: {
      withStructuredOutput: () => ({
        invoke: async (p: string) => {
          prompts.push(p);
          return values[Math.min(calls++, values.length - 1)];
        },
      }),
    } as never,
  };
};

describe("parseWithRepair (P1-02)", () => {
  it("đúng ngay lần 1: chỉ gọi 1 lần", async () => {
    const prompts: string[] = [];
    const out = await parseWithRepair({
      schema,
      invoke: async (p) => {
        prompts.push(p);
        return { name: "a", count: 1 };
      },
      prompt: "soạn",
      label: "test",
      friendlyMessage: "sai định dạng",
    });
    expect(out).toEqual({ name: "a", count: 1 });
    expect(prompts).toHaveLength(1);
  });

  it("lần 1 thiếu trường → lần 2 sửa đúng: 2 lần gọi, prompt sửa chứa lỗi Zod", async () => {
    const prompts: string[] = [];
    let calls = 0;
    const out = await parseWithRepair({
      schema,
      invoke: async (p) => {
        prompts.push(p);
        calls += 1;
        return calls === 1 ? { name: "a" } : { name: "a", count: 2 };
      },
      prompt: "soạn",
      label: "test",
      friendlyMessage: "sai định dạng",
    });
    expect(out).toEqual({ name: "a", count: 2 });
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain("SAI ĐỊNH DẠNG");
    expect(prompts[1]).toContain("count");
  });

  it("2 lần đều sai → ném lỗi thân thiện, log có chi tiết Zod", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let calls = 0;
    await expect(
      parseWithRepair({
        schema,
        invoke: async () => {
          calls += 1;
          return { name: "a" };
        },
        prompt: "soạn",
        label: "test",
        friendlyMessage: "AI soạn chưa đúng định dạng, bấm thử lại",
      }),
    ).rejects.toThrow("AI soạn chưa đúng định dạng, bấm thử lại");
    expect(calls).toBe(2);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("bộ chấm LLM áp cùng pattern sửa schema (P1-02)", () => {
  it("verdict lần 1 thiếu passed → lần 2 đúng", async () => {
    const { model, prompts } = stubModel([
      { results: [{ id: "am-ap" }] },
      { results: [{ id: "am-ap", passed: true, issue: "" }] },
    ]);
    const judge = createLlmJudge(() => model);
    const results = await judge({ subject: "x", criteria: [{ id: "am-ap", description: "Ấm áp" }], output: {}, context: "" });
    expect(results).toEqual([{ id: "am-ap", passed: true, issue: "" }]);
    expect(prompts).toHaveLength(2);
  });

  it("2 lần đều sai → ném lỗi (tầng evaluate sẽ retry rồi báo judge-unavailable)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { model } = stubModel([{ results: [{ id: "am-ap" }] }]);
    const judge = createLlmJudge(() => model);
    await expect(judge({ subject: "x", criteria: [{ id: "am-ap", description: "Ấm áp" }], output: {}, context: "" })).rejects.toThrow("AI chấm chưa đúng định dạng");
    spy.mockRestore();
  });
});

describe("chắt lọc trí nhớ áp cùng pattern sửa schema (P1-02)", () => {
  const args = { studentName: "Bé A", ageLabel: "4 tuổi", existingMemories: [], transcript: [], events: [] } as never;

  it("lần 1 thiếu summary → lần 2 đúng", async () => {
    const { model, prompts } = stubModel([{ facts: ["thích xe"] }, { summary: "Bé thích xe", facts: ["thích xe"] }]);
    const distill = createChildDistiller(() => model);
    await expect(distill(args)).resolves.toEqual({ summary: "Bé thích xe", facts: ["thích xe"] });
    expect(prompts).toHaveLength(2);
  });
});
