// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { api, apiStream, ApiError, chatFetch } from "@/lib/api-client";

const stubFetch = (res: Response) => vi.stubGlobal("fetch", vi.fn(async () => res));
const ndjson = (...events: unknown[]) => events.map((e) => JSON.stringify(e)).join("\n") + "\n";

afterEach(() => vi.unstubAllGlobals());

describe("api()", () => {
  it("GET không body: không gửi content-type", async () => {
    stubFetch(Response.json({ ok: 1 }));
    expect(await api("/api/plans/1")).toEqual({ ok: 1 });
    expect(fetch).toHaveBeenCalledWith("/api/plans/1", { method: "GET", headers: {}, body: undefined });
  });

  it("có body: mặc định POST JSON", async () => {
    stubFetch(Response.json({ id: "p1" }));
    expect(await api("/api/plans", { body: { topic: "Nước" } })).toEqual({ id: "p1" });
    expect(fetch).toHaveBeenCalledWith("/api/plans", { method: "POST", headers: { "content-type": "application/json" }, body: '{"topic":"Nước"}' });
  });

  it("thành công nhưng không có body JSON (vd. 204): trả về object rỗng", async () => {
    stubFetch(new Response(null, { status: 204 }));
    expect(await api("/api/memory/1", { method: "DELETE" })).toEqual({});
  });

  it("lỗi nghiệp vụ: ném ApiError giữ mã lỗi, thông điệp và HTTP status", async () => {
    stubFetch(Response.json({ error: { code: "ERR-RATE-01", message: "Thao tác quá nhanh" } }, { status: 429 }));
    const err = await api("/api/plans", { body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: "ERR-RATE-01", message: "Thao tác quá nhanh", status: 429 });
  });

  it("lỗi không có body JSON: ApiError mặc định", async () => {
    stubFetch(new Response("Bad Gateway", { status: 502 }));
    await expect(api("/api/plans")).rejects.toMatchObject({ code: "ERR-INTERNAL", message: "Có lỗi xảy ra", status: 502 });
  });
});

describe("apiStream()", () => {
  it("đọc từng dòng NDJSON, báo tiến trình và trả về dòng result", async () => {
    stubFetch(new Response(ndjson({ type: "progress", step: 1 }, { type: "result", id: "p1" })));
    const events: unknown[] = [];
    const result = await apiStream<{ id: string }>("/api/plans", { topic: "Nước" }, (e) => events.push(e));

    expect(result).toMatchObject({ type: "result", id: "p1" });
    expect(events).toEqual([{ type: "progress", step: 1 }, { type: "result", id: "p1" }]);
  });

  it("dòng cuối không có ký tự xuống dòng vẫn được đọc", async () => {
    stubFetch(new Response('{"type":"result","id":"p2"}'));
    expect(await apiStream("/api/plans", {}, () => {})).toMatchObject({ id: "p2" });
  });

  it("dòng error: ném ApiError theo mã lỗi của server", async () => {
    stubFetch(new Response(ndjson({ type: "error", error: { code: "ERR-AI-01", message: "AI lỗi" } })));
    await expect(apiStream("/api/plans", {}, () => {})).rejects.toMatchObject({ code: "ERR-AI-01", message: "AI lỗi", status: 500 });
  });

  it("dòng error không kèm chi tiết: ApiError mặc định", async () => {
    stubFetch(new Response(ndjson({ type: "error" })));
    await expect(apiStream("/api/plans", {}, () => {})).rejects.toMatchObject({ code: "ERR-INTERNAL" });
  });

  it("luồng kết thúc mà không có result: báo mất kết nối", async () => {
    stubFetch(new Response(ndjson({ type: "progress" })));
    await expect(apiStream("/api/plans", {}, () => {})).rejects.toMatchObject({ code: "ERR-NET-01", status: 502 });
  });

  it("HTTP lỗi (vd. bấm quá nhanh): ném ApiError, không đọc luồng", async () => {
    stubFetch(Response.json({ error: { code: "ERR-RATE-01", message: "Thao tác quá nhanh" } }, { status: 429 }));
    await expect(apiStream("/api/plans", {}, () => {})).rejects.toMatchObject({ code: "ERR-RATE-01", status: 429 });
  });

  it("HTTP lỗi không có body JSON: ApiError mặc định", async () => {
    stubFetch(new Response(null, { status: 503 }));
    await expect(apiStream("/api/plans", {}, () => {})).rejects.toMatchObject({ code: "ERR-INTERNAL", status: 503 });
  });
});

describe("chatFetch()", () => {
  it("thành công: trả nguyên phản hồi để AI SDK đọc luồng", async () => {
    const res = new Response("data: ok");
    stubFetch(res);
    expect(await chatFetch("/api/chat", { method: "POST" })).toBe(res);
    expect(fetch).toHaveBeenCalledWith("/api/chat", { method: "POST" });
  });

  it("lỗi HTTP: ném ApiError mang mã, thông điệp và status của server", async () => {
    stubFetch(Response.json({ error: { code: "ERR-RATE-01", message: "Thao tác quá nhanh" } }, { status: 429 }));
    await expect(chatFetch("/api/chat")).rejects.toMatchObject({ code: "ERR-RATE-01", message: "Thao tác quá nhanh", status: 429 });
  });

  it("lỗi không có body JSON: ApiError mặc định", async () => {
    stubFetch(new Response("Bad Gateway", { status: 502 }));
    await expect(chatFetch("/api/chat")).rejects.toMatchObject({ code: "ERR-INTERNAL", status: 502 });
  });
});
