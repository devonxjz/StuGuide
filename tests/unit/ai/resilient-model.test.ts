import { describe, it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { fakeModel } from "@langchain/core/testing";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";
import { isAppError } from "@/core/errors";
import { AI_UNAVAILABLE_MESSAGE, AiUnavailableError, isProviderOutage, ResilientChatModel, type FallbackEvent } from "@/ai/resilient-model";

afterEach(() => vi.restoreAllMocks());

const httpError = (status: number, extra: object = {}) => Object.assign(new Error(`HTTP ${status}`), { status, ...extra });
const ok = (text: string) => fakeModel().respond(new AIMessage(text));
const failing = (error: Error) => fakeModel().respond(error);

function resilient(primary: BaseChatModel, fallback?: BaseChatModel, task: "chat" | "creative-generation" = "chat") {
  const events: FallbackEvent[] = [];
  const model = new ResilientChatModel({ task, primary, fallback, primaryName: "big-2025-01-01", fallbackName: "small-2025-01-01", onFallback: (e) => events.push(e) });
  return { model, events };
}

describe("isProviderOutage", () => {
  it.each([
    [httpError(429), true],
    [httpError(500), true],
    [httpError(503), true],
    [httpError(404), true],
    [httpError(408), true],
    [httpError(400), false],
    [httpError(401), false],
    [httpError(403), false],
    [Object.assign(new Error("quota"), { code: "insufficient_quota" }), true],
    [Object.assign(new Error("gone"), { code: "model_not_found" }), true],
    [Object.assign(new Error("net"), { code: "ECONNRESET" }), true],
    [Object.assign(new Error("net"), { code: "EPIPE" }), false],
    [new Error("fetch failed", { cause: Object.assign(new Error("x"), { code: "ETIMEDOUT" }) }), true],
    [Object.assign(new Error("hủy"), { name: "AbortError", status: 503 }), false],
    [new Error("lỗi lập trình"), false],
    ["chuỗi", false],
    [null, false],
    [undefined, false],
  ])("%j → %s", (error, expected) => {
    expect(isProviderOutage(error)).toBe(expected);
  });
});

describe("ResilientChatModel (P1-14)", () => {
  it("model chính chạy được thì không đụng tới dự phòng và không log", async () => {
    const { model, events } = resilient(ok("từ model chính"), ok("từ dự phòng"));
    expect((await model.invoke("chào")).content).toBe("từ model chính");
    expect(events).toEqual([]);
  });

  it("chat: model chính lỗi 429 thì tự chuyển sang model nhanh và log ghi rõ task/from/to/lý do", async () => {
    const { model, events } = resilient(failing(httpError(429)), ok("từ dự phòng"));
    expect((await model.invoke("chào")).content).toBe("từ dự phòng");
    expect(events).toEqual([{ event: "llm_fallback", task: "chat", from: "big-2025-01-01", to: "small-2025-01-01", reason: "HTTP 429" }]);
  });

  it("mặc định log cảnh báo dạng JSON một dòng", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const model = new ResilientChatModel({ task: "chat", primary: failing(httpError(500)), fallback: ok("x"), primaryName: "a", fallbackName: "b" });
    await model.invoke("chào");
    expect(JSON.parse(warn.mock.calls[0][0] as string)).toMatchObject({ event: "llm_fallback", task: "chat", from: "a", to: "b" });
  });

  it("task sáng tạo (không có dự phòng): lỗi nhà cung cấp trả lỗi thân thiện, KHÔNG hạ cấp lặng lẽ", async () => {
    const { model, events } = resilient(failing(httpError(503)), undefined, "creative-generation");
    const error = await model.invoke("soạn giáo án").catch((e) => e);
    expect(error).toBeInstanceOf(AiUnavailableError);
    expect(error.message).toBe(AI_UNAVAILABLE_MESSAGE);
    expect(error).toMatchObject({ code: "ERR-AI-01", status: 503 });
    expect(isAppError(error)).toBe(true);
    expect(events).toEqual([]);
  });

  it("lỗi không phải của nhà cung cấp (400, lỗi lập trình) được ném nguyên vẹn, không đổi sang dự phòng", async () => {
    for (const error of [httpError(400), new Error("bug của ta")]) {
      const fallback = ok("không được dùng");
      const { model, events } = resilient(failing(error), fallback);
      await expect(model.invoke("x")).rejects.toBe(error);
      expect(events).toEqual([]);
      expect(fallback.calls).toHaveLength(0);
    }
  });

  it("dự phòng cũng lỗi nhà cung cấp → AiUnavailableError; lỗi khác → ném nguyên vẹn", async () => {
    const outage = resilient(failing(httpError(500)), failing(httpError(503)));
    await expect(outage.model.invoke("x")).rejects.toBeInstanceOf(AiUnavailableError);
    const bug = new Error("dự phòng hỏng");
    const other = resilient(failing(httpError(500)), failing(bug));
    await expect(other.model.invoke("x")).rejects.toBe(bug);
  });

  it("người dùng hủy (AbortError) không kích hoạt dự phòng", async () => {
    const abort = Object.assign(new Error("hủy"), { name: "AbortError" });
    const { model, events } = resilient(failing(abort), ok("x"));
    await expect(model.invoke("x")).rejects.toBe(abort);
    expect(events).toEqual([]);
  });

  it("stream: lỗi trước token đầu thì chuyển sang dự phòng và vẫn stream được", async () => {
    const { model, events } = resilient(failing(httpError(500)), ok("xin chào"));
    let text = "";
    for await (const chunk of await model.stream("x")) text += chunk.content;
    expect(text).toBe("xin chào");
    expect(events).toHaveLength(1);
  });

  it("stream: model chính ổn thì stream bình thường, không log", async () => {
    const { model, events } = resilient(ok("trả lời"), ok("dự phòng"));
    let text = "";
    for await (const chunk of await model.stream("x")) text += chunk.content;
    expect(text).toBe("trả lời");
    expect(events).toEqual([]);
  });

  it("stream: không có dự phòng thì báo AiUnavailableError", async () => {
    const { model } = resilient(failing(httpError(429)), undefined, "creative-generation");
    await expect((async () => { for await (const _ of await model.stream("x")) void _; })()).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("withStructuredOutput: lỗi nhà cung cấp thì dùng dự phòng, kết quả vẫn đúng hình dạng", async () => {
    const schema = z.object({ a: z.number() });
    const structured = (invoke: () => Promise<unknown>) => ({ withStructuredOutput: () => ({ invoke }) }) as unknown as BaseChatModel;
    const { model, events } = resilient(
      structured(async () => { throw httpError(429); }),
      structured(async () => ({ a: 7 })),
    );
    const runnable = model.withStructuredOutput(schema as never) as unknown as { invoke(i: string): Promise<unknown> };
    expect(await runnable.invoke("x")).toEqual({ a: 7 });
    expect(events).toHaveLength(1);
  });

  it("withStructuredOutput không dự phòng: báo AiUnavailableError", async () => {
    const primary = { withStructuredOutput: () => ({ invoke: async () => { throw httpError(500); } }) } as unknown as BaseChatModel;
    const runnable = resilient(primary, undefined, "creative-generation").model.withStructuredOutput({} as never) as unknown as { invoke(i: string): Promise<unknown> };
    await expect(runnable.invoke("x")).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("dùng được trong agent có công cụ: vòng đầu model chính sập thì dự phòng gọi công cụ, vòng sau model chính trả lời", async () => {
    const lookup = tool(async () => "kết quả tra cứu", { name: "lookup", description: "Tra cứu", schema: z.object({}) });
    const fallback = fakeModel().respondWithTools([{ name: "lookup", args: {}, id: "c1" }]);
    const primary = failing(httpError(503)).respond(new AIMessage("trả lời sau khi tra cứu")); // lần 1 sập, lần 2 đã phục hồi
    const { model, events } = resilient(primary, fallback);

    const agent = createAgent({ model: model as never, tools: [lookup] });
    const result = await agent.invoke({ messages: [new HumanMessage("chào")] });

    expect(String(result.messages.at(-1)!.content)).toBe("trả lời sau khi tra cứu");
    expect(events).toHaveLength(1);
  });
});
