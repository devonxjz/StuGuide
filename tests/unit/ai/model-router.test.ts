import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ChatOpenAI } from "@langchain/openai";
import { getTaskParams, routeModel, WARN_AT_FRACTION_OF_MAX, type TaskType } from "@/ai/model-router";
import { UsageLogger } from "@/ai/usage-logger";
import { DEFAULT_CHAT_MODEL, DEFAULT_FAST_MODEL, isPinnedModel, resolveAiConfig } from "@/ai/config";

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
    const chat = routeModel("chat", cfg).primaryModel as ChatOpenAI;
    const fast = routeModel("extraction", cfg).primaryModel as ChatOpenAI;
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
      expect((routeModel(task, cfg).primaryModel as ChatOpenAI).maxTokens, task).toBe(maxTokens);
    }
  });

  it("trần theo đề xuất: chat 1500, giáo án 4000, bộ chấm 800", () => {
    expect(getTaskParams("chat").maxTokens).toBe(1500);
    expect(getTaskParams("creative-generation").maxTokens).toBe(4000);
    expect(getTaskParams("evaluation").maxTokens).toBe(800);
  });

  it("mỗi model đã gắn UsageLogger với ngưỡng cảnh báo bằng 80% trần (P1-10)", () => {
    const chat = routeModel("creative-generation", resolveAiConfig({ OPENAI_API_KEY: "sk-test" })).primaryModel as ChatOpenAI;
    const logger = (chat.callbacks as unknown[]).find((c): c is UsageLogger => c instanceof UsageLogger);
    expect(logger).toBeDefined();
    expect((logger as unknown as { options: { warnOutputTokens: number; task: string } }).options).toMatchObject({ task: "creative-generation", warnOutputTokens: 4000 * WARN_AT_FRACTION_OF_MAX });
  });
});

describe("model pin version và dự phòng theo tầng (P1-14)", () => {
  const cfg = resolveAiConfig({ OPENAI_API_KEY: "sk-test" });

  it("mặc định dùng snapshot có ngày", () => {
    expect(cfg.chatModel).toMatch(/-\d{4}-\d{2}-\d{2}$/);
    expect(cfg.fastModel).toMatch(/-\d{4}-\d{2}-\d{2}$/);
    expect([cfg.chatModel, cfg.fastModel].every(isPinnedModel)).toBe(true);
  });

  it("biến môi trường rỗng hoặc toàn khoảng trắng thì rơi về mặc định đã pin", () => {
    const blank = resolveAiConfig({ OPENAI_API_KEY: "sk-test", OPENAI_CHAT_MODEL: "  ", OPENAI_FAST_MODEL: "" });
    expect(blank.chatModel).toBe(DEFAULT_CHAT_MODEL);
    expect(blank.fastModel).toBe(DEFAULT_FAST_MODEL);
  });

  it.each([
    ["gpt-4.1-2025-04-14", true],
    ["gpt-4.1-mini-2025-04-14", true],
    ["gpt-4.1", false],
    ["gpt-4.1-mini", false],
    ["gpt-4.1-2025-4-14", false],
    ["gpt-4.1-2025-04-14-preview", false],
    ["", false],
  ])("isPinnedModel(%j) = %s", (name, expected) => {
    expect(isPinnedModel(name)).toBe(expected);
  });

  it(".env.example khớp giá trị mặc định trong config (không lệch nhau)", () => {
    const env = readFileSync(path.resolve(import.meta.dirname, "../../../.env.example"), "utf8");
    expect(env).toMatch(new RegExp(`^OPENAI_CHAT_MODEL=${DEFAULT_CHAT_MODEL}$`, "m"));
    expect(env).toMatch(new RegExp(`^OPENAI_FAST_MODEL=${DEFAULT_FAST_MODEL}$`, "m"));
  });

  it("chat có dự phòng là model nhanh; các task sáng tạo/phân tích không có (fail rõ ràng)", () => {
    expect(routeModel("chat", cfg).fallbackModel).toBeDefined();
    expect((routeModel("chat", cfg).fallbackModel as ChatOpenAI).model).toBe(cfg.fastModel);
    for (const task of ["creative-generation", "rewrite", "analysis", "personalization"] as const) expect(routeModel(task, cfg).fallbackModel, task).toBeUndefined();
  });

  it("task đã dùng model nhanh thì không có dự phòng (không còn gì yếu hơn)", () => {
    for (const task of ["extraction", "summarization", "summarization_memory", "evaluation"] as const) expect(routeModel(task, cfg).fallbackModel, task).toBeUndefined();
  });

  it("model chính và nhanh trùng tên thì không dựng dự phòng thừa", () => {
    const same = resolveAiConfig({ OPENAI_API_KEY: "sk-test", OPENAI_CHAT_MODEL: "m-2025-01-01", OPENAI_FAST_MODEL: "m-2025-01-01" });
    expect(routeModel("chat", same).fallbackModel).toBeUndefined();
  });

  it("dùng tên model chưa pin thì cảnh báo một lần duy nhất cho mỗi tên", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const live = resolveAiConfig({ OPENAI_API_KEY: "sk-test", OPENAI_CHAT_MODEL: "gpt-live-alias", OPENAI_FAST_MODEL: "mini-2025-01-01" });
    routeModel("creative-generation", live);
    routeModel("creative-generation", live);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("gpt-live-alias");
    warn.mockRestore();
  });
});
