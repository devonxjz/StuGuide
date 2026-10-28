import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveAiConfig } from "@/ai/config";
import { checkModelHealth, logHealthReport, MODEL_HEALTH_TIMEOUT_MS, type HealthReport } from "@/ai/model-health";

afterEach(() => vi.restoreAllMocks());

const config = resolveAiConfig({ OPENAI_API_KEY: "sk-test-key", OPENAI_CHAT_MODEL: "big-2025-01-01", OPENAI_FAST_MODEL: "small-2025-01-01", OPENAI_EMBEDDING_MODEL: "embed-2025-01-01" });
const NOW = new Date("2026-10-28T02:00:00Z");

/** fetch giả: trả status theo tên model trong URL */
const fetchBy = (statuses: Record<string, number | Error>) =>
  vi.fn(async (url: string) => {
    const model = decodeURIComponent(url.split("/").pop() as string);
    const result = statuses[model] ?? 200;
    if (result instanceof Error) throw result;
    return { status: result };
  });

describe("checkModelHealth (P1-14)", () => {
  it("mọi model còn dùng được → healthy, kèm thời điểm kiểm tra", async () => {
    const report = await checkModelHealth(config, { fetchFn: fetchBy({}), now: () => NOW });
    expect(report.healthy).toBe(true);
    expect(report.checkedAt).toBe("2026-10-28T02:00:00.000Z");
    expect(report.models.map((m) => [m.model, m.status])).toEqual([["big-2025-01-01", "ok"], ["small-2025-01-01", "ok"], ["embed-2025-01-01", "ok"]]);
  });

  it("gọi Models API với khóa Bearer, tên model đã mã hóa URL và có timeout", async () => {
    const fetchFn = fetchBy({});
    await checkModelHealth(resolveAiConfig({ OPENAI_API_KEY: "sk-abc", OPENAI_CHAT_MODEL: "a/b c-2025-01-01" }), { fetchFn });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, { headers: Record<string, string>; signal: AbortSignal }];
    expect(url).toBe("https://api.openai.com/v1/models/a%2Fb%20c-2025-01-01");
    expect(init.headers.Authorization).toBe("Bearer sk-abc");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(MODEL_HEALTH_TIMEOUT_MS).toBe(10_000);
  });

  it("404 = model bị gỡ/deprecate → missing, báo không khỏe", async () => {
    const report = await checkModelHealth(config, { fetchFn: fetchBy({ "big-2025-01-01": 404 }) });
    expect(report.healthy).toBe(false);
    expect(report.models[0]).toMatchObject({ model: "big-2025-01-01", status: "missing", httpStatus: 404 });
  });

  it.each([401, 403, 429, 500, 503])("HTTP %s chưa kết luận được → error (không khẳng định model hỏng)", async (code) => {
    const report = await checkModelHealth(config, { fetchFn: fetchBy({ "small-2025-01-01": code }) });
    expect(report.healthy).toBe(false);
    expect(report.models[1]).toMatchObject({ status: "error", httpStatus: code });
  });

  it("lỗi mạng/timeout không ném ra ngoài mà thành status error", async () => {
    const report = await checkModelHealth(config, { fetchFn: fetchBy({ "embed-2025-01-01": new Error("fetch failed") }) });
    expect(report.models[2]).toEqual({ model: "embed-2025-01-01", roles: ["embedding"], status: "error", pinned: true });
  });

  it("các vai trò trùng model chỉ kiểm tra một lần", async () => {
    const same = resolveAiConfig({ OPENAI_API_KEY: "k", OPENAI_CHAT_MODEL: "m-2025-01-01", OPENAI_FAST_MODEL: "m-2025-01-01", OPENAI_EMBEDDING_MODEL: "e-2025-01-01" });
    const fetchFn = fetchBy({});
    const report = await checkModelHealth(same, { fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(report.models[0].roles).toEqual(["chat", "fast"]);
  });

  it("đánh dấu model chưa pin snapshot có ngày", async () => {
    const live = resolveAiConfig({ OPENAI_API_KEY: "k", OPENAI_CHAT_MODEL: "gpt-live", OPENAI_FAST_MODEL: "f-2025-01-01", OPENAI_EMBEDDING_MODEL: "text-embedding-3-small" });
    const report = await checkModelHealth(live, { fetchFn: fetchBy({}) });
    expect(report.models.map((m) => m.pinned)).toEqual([false, true, false]);
  });

  it("báo cáo không chứa khóa API", async () => {
    const report = await checkModelHealth(config, { fetchFn: fetchBy({ "big-2025-01-01": 404 }) });
    expect(JSON.stringify(report)).not.toContain("sk-test-key");
  });
});

describe("logHealthReport", () => {
  const report = (models: HealthReport["models"]): HealthReport => ({ healthy: false, checkedAt: NOW.toISOString(), models });

  it("model không ổn → log error; model ổn nhưng chưa pin → log warn; model ổn đã pin → im lặng", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logHealthReport(
      report([
        { model: "gone", roles: ["chat"], status: "missing", pinned: true, httpStatus: 404 },
        { model: "alias", roles: ["fast"], status: "ok", pinned: false },
        { model: "good-2025-01-01", roles: ["embedding"], status: "ok", pinned: true },
      ]),
    );
    expect(error).toHaveBeenCalledTimes(1);
    expect(JSON.parse(error.mock.calls[0][0] as string)).toMatchObject({ event: "model_health", level: "error", model: "gone", status: "missing", httpStatus: 404 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(warn.mock.calls[0][0] as string)).toMatchObject({ level: "warn", model: "alias" });
  });
});
