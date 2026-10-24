import { describe, it, expect } from "vitest";
import { ChatOpenAI } from "@langchain/openai";
import { getTaskParams, routeModel } from "@/ai/model-router";
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
});
