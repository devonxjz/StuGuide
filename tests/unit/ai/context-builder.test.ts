import { describe, it, expect } from "vitest";
import { buildHistoryWindow, estimateTokens, messageToText, cardDigest, HISTORY_TOKEN_BUDGET, SUMMARY_TRIGGER_TOKENS, SUMMARY_TARGET_TOKENS } from "@/ai/memory/context-builder";
import type { StoredMessage } from "@/ai/memory/context-builder";

const msg = (seq: number, role: "user" | "assistant", text: string, extra: StoredMessage["parts"] = []): StoredMessage => ({
  seq,
  role,
  parts: [...extra, { type: "text", text }],
});
const long = (n: number) => "từ ".repeat(n);

describe("estimateTokens", () => {
  it("tăng theo độ dài và tính thận trọng cho tiếng Việt", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("a".repeat(300))).toBeGreaterThan(estimateTokens("a".repeat(30)));
    expect(estimateTokens("chào cô giáo")).toBeGreaterThanOrEqual(4);
  });
});

describe("cardDigest – giữ lại những gì LLM cần nhớ từ thẻ kết quả", () => {
  it("thẻ giáo án có planId, tên, trạng thái", () => {
    const d = cardDigest({ kind: "plan", planId: "p1", plan: { id: "p1", gameName: "Chuyến xe tình bạn", status: "ai_draft" } as never, violations: [] });
    expect(d).toContain("p1");
    expect(d).toContain("Chuyến xe tình bạn");
    expect(d).toContain("ai_draft");
  });
  it("thẻ checklist, thẻ phụ huynh, cảnh báo, thông báo", () => {
    expect(cardDigest({ kind: "checklist", planId: "p1", gameName: "X", checklistId: "c1", criteria: ["a", "b"] })).toMatch(/checklist.*2 tiêu chí/i);
    expect(cardDigest({ kind: "parent-card", cardId: "k1", planId: "p1", status: "draft", content: {} as never })).toContain("k1");
    expect(cardDigest({ kind: "alerts", alerts: [{ studentName: "Gia Huy", pattern: "ngập ngừng" } as never] })).toContain("Gia Huy");
    expect(cardDigest({ kind: "notice", tone: "warning", message: "Cần duyệt trước" })).toContain("Cần duyệt trước");
  });
});

describe("messageToText", () => {
  it("ghép văn bản với bản tóm tắt các thao tác đã làm", () => {
    const t = messageToText(msg(1, "assistant", "Mình đã tạo xong.", [{ type: "data-card", data: { kind: "plan", planId: "p9", plan: { id: "p9", gameName: "Hộp bí mật", status: "ai_draft" } as never, violations: [] } }]));
    expect(t).toContain("Mình đã tạo xong.");
    expect(t).toContain("p9");
  });
});

describe("buildHistoryWindow", () => {
  it("hội thoại ngắn: giữ nguyên toàn bộ, không có gì cần tóm tắt", () => {
    const r = buildHistoryWindow([msg(1, "user", "Xin chào"), msg(2, "assistant", "Chào cô")], 0);
    expect(r.window.map((m) => m.getType())).toEqual(["human", "ai"]);
    expect(r.overflow).toEqual([]);
  });

  it("vượt ngưỡng: cửa sổ ≤ ngân sách cứng, phần cũ nhất được đề nghị gộp vào summary", () => {
    const messages = Array.from({ length: 20 }, (_, i) => msg(i + 1, i % 2 === 0 ? "user" : "assistant", long(400)));
    const r = buildHistoryWindow(messages, 0);
    const tokens = (ms: { seq: number }[]) => ms.reduce((t, m) => t + estimateTokens(messageToText(messages[m.seq - 1])), 0);
    expect(r.windowMessages.length).toBeGreaterThanOrEqual(2);
    expect(tokens(r.windowMessages)).toBeLessThanOrEqual(HISTORY_TOKEN_BUDGET);
    expect(r.overflow.length).toBeGreaterThan(0);
    // overflow luôn là các tin CŨ NHẤT, liên tục từ đầu, và để lại ≈ ngưỡng đích
    expect(r.overflow.map((m) => m.seq)).toEqual(Array.from({ length: r.overflow.length }, (_, i) => i + 1));
    expect(tokens(messages.slice(r.overflow.length).map((m) => m))).toBeLessThanOrEqual(SUMMARY_TARGET_TOKENS + 600);
    // tin bị đẩy khỏi cửa sổ chắc chắn nằm trong overflow (không mất thông tin)
    const inWindow = new Set(r.windowMessages.map((m) => m.seq));
    const folded = new Set(r.overflow.map((m) => m.seq));
    for (const m of messages) expect(inWindow.has(m.seq) || folded.has(m.seq)).toBe(true);
  });

  it("dưới ngưỡng kích hoạt thì chưa tóm tắt dù đã khá dài (tránh tóm tắt liên tục)", () => {
    const messages = Array.from({ length: 4 }, (_, i) => msg(i + 1, i % 2 === 0 ? "user" : "assistant", long(500)));
    expect(messages.reduce((t, m) => t + estimateTokens(messageToText(m)), 0)).toBeLessThan(SUMMARY_TRIGGER_TOKENS);
    const r = buildHistoryWindow(messages, 0);
    expect(r.overflow).toEqual([]);
    expect(r.windowMessages).toHaveLength(4);
  });

  it("tin đã gộp vào summary không bị đưa lại cho LLM và không tính là tràn", () => {
    const messages = Array.from({ length: 10 }, (_, i) => msg(i + 1, i % 2 === 0 ? "user" : "assistant", long(500)));
    const first = buildHistoryWindow(messages, 0);
    const upTo = Math.max(...first.overflow.map((m) => m.seq));
    const second = buildHistoryWindow(messages, upTo);
    expect(second.overflow).toEqual([]);
    expect(second.windowMessages.every((m) => m.seq > upTo)).toBe(true);
  });

  it("luôn giữ tin cuối của cô dù vượt ngân sách và bắt đầu cửa sổ bằng tin của cô", () => {
    const r = buildHistoryWindow([msg(1, "assistant", long(50)), msg(2, "user", long(HISTORY_TOKEN_BUDGET))], 0);
    expect(r.window).toHaveLength(1);
    expect(r.window[0].getType()).toBe("human");
  });
});
