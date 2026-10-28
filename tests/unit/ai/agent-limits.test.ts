import { describe, it, expect } from "vitest";
import { z } from "zod";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { fakeModel } from "@langchain/core/testing";
import { tool } from "@langchain/core/tools";
import { AgentTimeoutError, createStuGuideAgent } from "@/ai/agent/create-agent";
import { FAMILY_CHAT_LIMITS, LIMIT_REACHED_NOTE, REPEATED_CALL_NOTE, TEACHER_CHAT_LIMITS, recursionLimitFor, type AgentLimits } from "@/ai/agent/limits";

type Chunk = [mode: string, payload: unknown];

/** Công cụ đếm số lần được thực thi thật. */
function countingTool(impl: () => Promise<string> = async () => "ok") {
  const state = { executed: 0 };
  const t = tool(
    async ({ n }: { n: number }) => {
      state.executed++;
      void n;
      return impl();
    },
    { name: "lookup", description: "Tra cứu", schema: z.object({ n: z.number() }) },
  );
  return { tool: t, state };
}

/** Model gọi công cụ `lookup` liên tục với tham số khác nhau `calls` lần rồi mới trả lời. */
function modelCallingTool(calls: number, args: (i: number) => { n: number } = (i) => ({ n: i })) {
  let model = fakeModel();
  for (let i = 0; i < calls; i++) model = model.respondWithTools([{ name: "lookup", args: args(i), id: `call-${i}` }]);
  return model.respond(new AIMessage("Mình trả lời dựa trên kết quả đã có."));
}

async function run(model: ReturnType<typeof fakeModel>, t: ReturnType<typeof countingTool>["tool"], limits: AgentLimits, signal?: AbortSignal) {
  const agent = createStuGuideAgent({ model: model as never, tools: [t], systemPrompt: "test", limits });
  const chunks: Chunk[] = [];
  for await (const chunk of await agent.stream([new HumanMessage("chào")], signal)) chunks.push(chunk as Chunk);
  const toolMessages = chunks.flatMap(([mode, payload]) => (mode === "messages" && (payload as [{ getType(): string }])[0].getType() === "tool" ? [(payload as [{ content: string }])[0]] : []));
  return { chunks, toolMessages };
}

describe("lưới chặn cuối khi model cứ gọi tiếp sau khi bị chặn (P1-09)", () => {
  it("vượt recursionLimit thì ném lỗi để tầng dịch vụ báo thân thiện, không lặp vô hạn", async () => {
    const { tool: t, state } = countingTool();
    await expect(run(modelCallingTool(50), t, FAMILY_CHAT_LIMITS)).rejects.toThrow(/Recursion limit/);
    expect(state.executed).toBe(5);
  });
});

describe("giới hạn số lần gọi công cụ (P1-09)", () => {
  it("cấu hình: chat giáo viên 8 lần, chat gia đình 5 lần, timeout 120s", () => {
    expect(TEACHER_CHAT_LIMITS).toEqual({ maxToolCalls: 8, timeoutMs: 120_000 });
    expect(FAMILY_CHAT_LIMITS).toEqual({ maxToolCalls: 5, timeoutMs: 120_000 });
  });

  it("recursionLimit chừa chỗ cho maxToolCalls vòng + 1 vòng bị chặn + lượt trả lời cuối", () => {
    expect(recursionLimitFor(8)).toBe(32);
    expect(recursionLimitFor(5)).toBe(23);
  });

  it("chat giáo viên: model cố gọi lần thứ 9 thì bị chặn, công cụ chỉ chạy 8 lần và model vẫn trả lời + có ghi chú dừng sớm", async () => {
    const { tool: t, state } = countingTool();
    const { toolMessages, chunks } = await run(modelCallingTool(9), t, TEACHER_CHAT_LIMITS);

    expect(state.executed).toBe(8);
    expect(toolMessages).toHaveLength(9);
    expect(toolMessages.at(-1)!.content).toBe(LIMIT_REACHED_NOTE);
    expect(JSON.stringify(chunks)).toContain("Mình trả lời dựa trên kết quả đã có.");
  });

  it("chat gia đình: trần 5 lần", async () => {
    const { tool: t, state } = countingTool();
    await run(modelCallingTool(6), t, FAMILY_CHAT_LIMITS);
    expect(state.executed).toBe(5);
  });

  it("đúng trần thì không bị chặn", async () => {
    const { tool: t, state } = countingTool();
    const { toolMessages } = await run(modelCallingTool(5), t, FAMILY_CHAT_LIMITS);
    expect(state.executed).toBe(5);
    expect(toolMessages.every((m) => m.content === "ok")).toBe(true);
  });

  it("ghi chú dừng sớm nói rõ phải trả lời bằng kết quả đã có", () => {
    expect(LIMIT_REACHED_NOTE).toMatch(/dừng sớm/);
    expect(LIMIT_REACHED_NOTE).toMatch(/kết quả đã có/);
  });
});

describe("cắt vòng lặp gọi lặp lại (P1-09)", () => {
  it("gọi lại ngay cùng công cụ + cùng tham số thì không chạy lần hai và trả ghi chú", async () => {
    const { tool: t, state } = countingTool();
    const { toolMessages } = await run(modelCallingTool(3, () => ({ n: 1 })), t, TEACHER_CHAT_LIMITS);

    expect(state.executed).toBe(1);
    expect(toolMessages.map((m) => m.content)).toEqual(["ok", REPEATED_CALL_NOTE, REPEATED_CALL_NOTE]);
  });

  it("cùng công cụ nhưng tham số khác thì vẫn chạy", async () => {
    const { tool: t, state } = countingTool();
    await run(modelCallingTool(3), t, TEACHER_CHAT_LIMITS);
    expect(state.executed).toBe(3);
  });

  it("xen kẽ A, B, A không bị coi là lặp (chỉ cắt khi liên tiếp)", async () => {
    const { tool: t, state } = countingTool();
    await run(modelCallingTool(3, (i) => ({ n: i === 1 ? 2 : 1 })), t, TEACHER_CHAT_LIMITS);
    expect(state.executed).toBe(3);
  });
});

describe("timeout riêng cho agent (P1-09)", () => {
  const never = () => new Promise<string>(() => {});

  it("công cụ treo quá timeout thì stream kết thúc bằng AgentTimeoutError, không treo request", async () => {
    const { tool: t } = countingTool(never);
    const started = Date.now();
    await expect(run(modelCallingTool(1), t, { maxToolCalls: 8, timeoutMs: 50 })).rejects.toBeInstanceOf(AgentTimeoutError);
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("người dùng tự hủy thì KHÔNG bị coi là timeout", async () => {
    const { tool: t } = countingTool(never);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 30);
    const error = await run(modelCallingTool(1), t, { maxToolCalls: 8, timeoutMs: 60_000 }, controller.signal).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(AgentTimeoutError);
  });

  it("lượt chạy nhanh hơn timeout thì hoàn tất bình thường", async () => {
    const { tool: t } = countingTool();
    const { chunks } = await run(modelCallingTool(1), t, { maxToolCalls: 8, timeoutMs: 10_000 });
    expect(chunks.length).toBeGreaterThan(0);
  });
});
