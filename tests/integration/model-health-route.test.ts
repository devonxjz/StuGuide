import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createTestContainer } from "../helpers/test-container";
import { GET } from "@/app/api/v1/cron/model-health/route";

const URL_ = "http://localhost/api/v1/cron/model-health";
const SECRET = "cron-secret-for-tests-0123456789";
let ipSeq = 0;

const call = (headers: Record<string, string> = {}) => GET(new NextRequest(URL_, { headers: { "x-forwarded-for": `203.0.113.${++ipSeq}`, ...headers } }), { params: Promise.resolve({}) });
const authed = () => call({ authorization: `Bearer ${SECRET}` });

beforeAll(async () => {
  await createTestContainer();
});

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
  vi.stubEnv("OPENAI_CHAT_MODEL", "big-2025-01-01");
  vi.stubEnv("OPENAI_FAST_MODEL", "small-2025-01-01");
  vi.stubEnv("OPENAI_EMBEDDING_MODEL", "embed-2025-01-01");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const stubOpenAi = (statusFor: (model: string) => number) => {
  const fetchMock = vi.fn(async (url: string) => ({ status: statusFor(decodeURIComponent(url.split("/").pop() as string)) }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("GET /api/v1/cron/model-health", () => {
  it("chưa cấu hình CRON_SECRET → 503 và không gọi OpenAI", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const fetchMock = stubOpenAi(() => 200);
    const res = await authed();
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("ERR-CRON-01");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["không có header", {}],
    ["sai secret", { authorization: "Bearer sai" }],
    ["sai scheme", { authorization: `Basic ${SECRET}` }],
  ])("%s → 401 và không gọi OpenAI", async (_name, headers) => {
    const fetchMock = stubOpenAi(() => 200);
    const res = await call(headers);
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("đúng secret và mọi model ổn → 200 với báo cáo", async () => {
    stubOpenAi(() => 200);
    const res = await authed();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.healthy).toBe(true);
    expect(body.models).toHaveLength(3);
    expect(JSON.stringify(body)).not.toContain("sk-test-key");
  });

  it("một model bị gỡ → 503 để giám sát cảnh báo, và log error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    stubOpenAi((model) => (model === "big-2025-01-01" ? 404 : 200));
    const res = await authed();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.healthy).toBe(false);
    expect(body.models[0]).toMatchObject({ model: "big-2025-01-01", status: "missing" });
    expect(error).toHaveBeenCalledWith(expect.stringContaining('"status":"missing"'));
  });

  it("OpenAI không phản hồi (lỗi mạng) → 503 chứ không treo hay 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("fetch failed"); }));
    const res = await authed();
    expect(res.status).toBe(503);
    expect((await res.json()).models.every((m: { status: string }) => m.status === "error")).toBe(true);
  });
});
