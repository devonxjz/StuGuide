import { describe, it, expect } from "vitest";
import { ChatOpenAI } from "@langchain/openai";
import { getTaskParams, routeModel, WARN_AT_FRACTION_OF_MAX, type TaskType } from "@/ai/model-router";
import { UsageLogger } from "@/ai/usage-logger";
import { resolveAiConfig } from "@/ai/config";

describe("model router (spec 6.1)", () => {
  it.each([
    ["creative-generation", 0.9],
    ["rewrite", 0.75],
    ["analysis", 0.25],
    ["extraction", 0.2],
    ["summarization", 0.35],
  ] as const)("%s dùng temperature %s", (task, t) => {
    expect(getTaskParams(task).temperature).toBe(t);
  });

  it("giáo án dùng model mạnh; tóm tắt, rút trích, trí nhớ dùng model nhanh", () => {
    expect(getTaskParams("creative-generation").tier).toBe("pro");
    expect(getTaskParams("chat").tier).toBe("pro");
    for (const t of ["summarization", "extraction", "summarization_memory"] as const) expect(getTaskParams(t).tier).toBe("fast");
  });

  it("không có chế độ giả lập: thiếu OPENAI_API_KEY thì báo lỗi rõ ràng", () => {
    expect(() => resolveAiConfig({})).toThrow(/OPENAI_API_KEY/);
    expect(() => resolveAiConfig({ OPENAI_API_KEY: "  " })).toThrow(/OPENAI_API_KEY/);
    expect(resolveAiConfig({ OPENAI_API_KEY: "sk-x", OPENAI_CHAT_MODEL: "m1" }).chatModel).toBe("m1");
  });

  it("routeModel luôn trả ChatOpenAI với model theo tầng", () => {
    const cfg = resolveAiConfig({ OPENAI_API_KEY: "sk-test", OPENAI_CHAT_MODEL: "big", OPENAI_FAST_MODEL: "small" });
    const chat = routeModel("chat", cfg) as ChatOpenAI;
    const fast = routeModel("extraction", cfg) as ChatOpenAI;
    expect(chat).toBeInstanceOf(ChatOpenAI);
    expect(chat.model).toBe("big");
    expect(fast.model).toBe("small");
    expect(typeof chat.bindTools).toBe("function");
  });

  it("mọi task đều có trần maxTokens dương và routeModel đặt đúng trần đó lên model (P1-10)", () => {
    const cfg = resolveAiConfig({ OPENAI_API_KEY: "sk-test" });
    const tasks: TaskType[] = ["creative-generation", "rewrite", "analysis", "extraction", "summarization", "chat", "summarization_memory", "personalization", "evaluation"];
    for (const task of tasks) {
      const { maxTokens } = getTaskParams(task);
      expect(maxTokens, task).toBeGreaterThan(0);
      expect((routeModel(task, cfg) as ChatOpenAI).maxTokens, task).toBe(maxTokens);
    }
  });

  it("trần theo đề xuất: chat 1500, giáo án 4000, bộ chấm 800", () => {
    expect(getTaskParams("chat").maxTokens).toBe(1500);
    expect(getTaskParams("creative-generation").maxTokens).toBe(4000);
    expect(getTaskParams("evaluation").maxTokens).toBe(800);
  });

  it("mỗi model đã gắn UsageLogger với ngưỡng cảnh báo bằng 80% trần (P1-10)", () => {
    const chat = routeModel("creative-generation", resolveAiConfig({ OPENAI_API_KEY: "sk-test" })) as ChatOpenAI;
    const logger = (chat.callbacks as unknown[]).find((c): c is UsageLogger => c instanceof UsageLogger);
    expect(logger).toBeDefined();
    expect((logger as unknown as { options: { warnOutputTokens: number; task: string } }).options).toMatchObject({ task: "creative-generation", warnOutputTokens: 4000 * WARN_AT_FRACTION_OF_MAX });
  });
});
