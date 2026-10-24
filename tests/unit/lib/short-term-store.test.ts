// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ShortTermStore } from "@/lib/short-term-store";

let sendBeacon: ReturnType<typeof vi.fn>;
const make = () => new ShortTermStore({ sessionId: "sess-12345678", studentId: "s1", endpoint: "/api/family/sessions" });
const bodyOf = async (call: unknown[]) => JSON.parse(await (call[1] as Blob).text());

beforeEach(() => {
  sendBeacon = vi.fn().mockReturnValue(true);
  Object.defineProperty(navigator, "sendBeacon", { value: sendBeacon, configurable: true });
});
afterEach(() => vi.restoreAllMocks());

describe("ShortTermStore – bộ nhớ ngắn hạn trong RAM trình duyệt", () => {
  it("ghi sự kiện đánh số tăng dần và KHÔNG gửi gì lên server trong lúc đang dùng", () => {
    const store = make();
    store.record("view");
    store.record("activity-step", { step: 1 });
    expect(store.snapshot().events.map((e) => e.seq)).toEqual([1, 2]);
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("flush gửi toàn bộ sự kiện + transcript bằng sendBeacon", async () => {
    const store = make();
    store.record("view");
    store.setTranscript([{ role: "parent", text: "Gợi ý trò chơi tối nay" }, { role: "assistant", text: "Mình gợi ý…" }]);
    expect(store.flush()).toBe(true);
    const [url] = sendBeacon.mock.calls[0];
    expect(url).toBe("/api/family/sessions");
    const body = await bodyOf(sendBeacon.mock.calls[0]);
    expect(body).toMatchObject({ sessionId: "sess-12345678", studentId: "s1" });
    expect(body.events).toHaveLength(1);
    expect(body.transcript).toHaveLength(2);
  });

  it("không gửi khi chưa có gì mới; gửi lại khi có dữ liệu mới (server loại trùng theo seq)", () => {
    const store = make();
    expect(store.flush()).toBe(false);
    store.record("note", { text: "bé thích khủng long" });
    store.flush();
    expect(store.flush()).toBe(false);
    store.record("reaction", { emoji: "😀" });
    expect(store.flush()).toBe(true);
    expect(sendBeacon).toHaveBeenCalledTimes(2);
  });

  it("attach: chỉ flush khi tab bị ẩn hoặc đóng (visibilitychange=hidden / pagehide), không flush khi đang hiển thị", () => {
    const store = make();
    const detach = store.attach(window, document);
    store.record("view");
    document.dispatchEvent(new Event("visibilitychange")); // đang visible
    expect(sendBeacon).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(sendBeacon).toHaveBeenCalledTimes(1);

    store.record("note", { text: "x" });
    window.dispatchEvent(new Event("pagehide"));
    expect(sendBeacon).toHaveBeenCalledTimes(2);

    detach();
    store.record("note", { text: "y" });
    window.dispatchEvent(new Event("pagehide"));
    expect(sendBeacon).toHaveBeenCalledTimes(2);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });

  it("dự phòng bằng fetch keepalive khi sendBeacon không dùng được", () => {
    Object.defineProperty(navigator, "sendBeacon", { value: undefined, configurable: true });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const store = make();
    store.record("view");
    expect(store.flush()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/family/sessions", expect.objectContaining({ method: "POST", keepalive: true }));
    vi.unstubAllGlobals();
  });

  it("giới hạn bộ nhớ: giữ tối đa 500 sự kiện mới nhất và 60 lượt hội thoại", () => {
    const store = make();
    for (let i = 0; i < 520; i++) store.record("view");
    store.setTranscript(Array.from({ length: 80 }, (_, i) => ({ role: i % 2 ? "assistant" : "parent", text: `t${i}` }) as const));
    const snap = store.snapshot();
    expect(snap.events).toHaveLength(500);
    expect(snap.events.at(-1)!.seq).toBe(520);
    expect(snap.transcript).toHaveLength(60);
    expect(snap.transcript.at(-1)!.text).toBe("t79");
  });
});
