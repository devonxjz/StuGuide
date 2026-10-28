import { describe, it, expect, vi, afterEach } from "vitest";
import { AIMessage } from "@langchain/core/messages";
import { fakeModel } from "@langchain/core/testing";
import { consoleUsageSink, UsageLogger, type LlmCallRecord } from "@/ai/usage-logger";

afterEach(() => vi.restoreAllMocks());

const reply = (outputTokens: number, finishReason = "stop") =>
  new AIMessage({ content: "nội dung", usage_metadata: { input_tokens: 120, output_tokens: outputTokens, total_tokens: 120 + outputTokens }, response_metadata: { finish_reason: finishReason } });

function setup(response: AIMessage | Error, warnOutputTokens = 800) {
  const records: LlmCallRecord[] = [];
  let clock = 1000;
  const logger = new UsageLogger({ task: "creative-generation", model: "gpt-test", warnOutputTokens, sink: (r) => records.push(r), now: () => (clock += 250) });
  const model = response instanceof Error ? fakeModel().respond(response) : fakeModel().respond(response);
  return { records, run: () => model.invoke("xin chào", { callbacks: [logger] }) };
}

describe("UsageLogger (P1-10)", () => {
  it("mỗi lần gọi ghi đủ task, model, input/output tokens và latency", async () => {
    const { records, run } = setup(reply(300));
    await run();
    expect(records).toEqual([{ event: "llm_call", task: "creative-generation", model: "gpt-test", inputTokens: 120, outputTokens: 300, latencyMs: 250, finishReason: "stop", status: "ok" }]);
  });

  it("không cảnh báo khi dưới ngưỡng", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await setup(reply(799)).run();
    expect(warn).not.toHaveBeenCalled();
  });

  it("cảnh báo khi output tokens chạm ngưỡng", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await setup(reply(800)).run();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("creative-generation/gpt-test dùng 800 output tokens"));
  });

  it("cảnh báo riêng khi đầu ra bị cắt ở trần (finish_reason=length) dù dưới ngưỡng", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { records, run } = setup(reply(10, "length"));
    await run();
    expect(records[0].finishReason).toBe("length");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("đã bị cắt ở trần"));
  });

  it("thiếu usage_metadata thì ghi null, không làm hỏng lần gọi", async () => {
    const { records, run } = setup(new AIMessage("không có usage"));
    await expect(run()).resolves.toBeInstanceOf(AIMessage);
    expect(records[0]).toMatchObject({ inputTokens: null, outputTokens: null, finishReason: null, status: "ok" });
  });

  it("model lỗi thì ghi status=error kèm latency, lỗi vẫn truyền lên cho nơi gọi", async () => {
    const { records, run } = setup(new Error("rate limit"));
    await expect(run()).rejects.toThrow("rate limit");
    expect(records[0]).toMatchObject({ status: "error", outputTokens: null, latencyMs: 250 });
  });

  it("sink ném lỗi cũng không làm hỏng lần gọi model", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = new UsageLogger({ task: "chat", model: "m", warnOutputTokens: 100, sink: () => { throw new Error("disk full"); } });
    await expect(fakeModel().respond(reply(5)).invoke("x", { callbacks: [logger] })).resolves.toBeInstanceOf(AIMessage);
    expect(error).toHaveBeenCalledWith("[ai-usage] ghi log lỗi", expect.any(Error));
  });

  it("các lần gọi song song không lẫn latency vì tách theo runId", async () => {
    const records: LlmCallRecord[] = [];
    let clock = 0;
    const logger = new UsageLogger({ task: "chat", model: "m", warnOutputTokens: 100, sink: (r) => records.push(r), now: () => (clock += 10) });
    await Promise.all([fakeModel().respond(reply(5)).invoke("a", { callbacks: [logger] }), fakeModel().respond(reply(6)).invoke("b", { callbacks: [logger] })]);
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.latencyMs > 0)).toBe(true);
  });
});

describe("consoleUsageSink", () => {
  it("lần gọi ok ghi một dòng JSON ở info, lần lỗi ở warn", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const base: LlmCallRecord = { event: "llm_call", task: "chat", model: "m", inputTokens: 1, outputTokens: 2, latencyMs: 3, finishReason: "stop", status: "ok" };
    consoleUsageSink(base);
    consoleUsageSink({ ...base, status: "error" });
    expect(JSON.parse(info.mock.calls[0][0] as string)).toEqual(base);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
