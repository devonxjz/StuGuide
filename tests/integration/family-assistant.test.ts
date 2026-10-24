import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AIMessage } from "@langchain/core/messages";
import { fakeModel } from "@langchain/core/testing";
import { createTestContainer } from "../helpers/test-container";
import { PermissionError } from "@/core/guardrails";
import { turnsToMessages } from "@/services/family/family-assistant.service";
import { estimateTokens, HISTORY_TOKEN_BUDGET } from "@/ai/memory/context-builder";
import type { UIMessageChunk } from "ai";

type T = Awaited<ReturnType<typeof createTestContainer>>;
let t: T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- thẻ kết quả đa hình
type AnyCard = { kind: string } & Record<string, any>;

beforeAll(async () => {
  t = await createTestContainer();
});
afterAll(async () => t.container.prisma.$disconnect());

const huyParent = () => ({ id: t.ids.huyParentId, role: "parent" as const });
const otherParent = () => ({ id: t.ids.parentIds[1], role: "parent" as const });
const textOf = (c: unknown): string => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b && typeof b === "object" && "text" in b ? String((b as { text: unknown }).text) : "")).join("") : "");

async function ask(model: ReturnType<typeof fakeModel>, text: string, actor = huyParent(), studentId = t.ids.huyId) {
  t.setChatModel(model);
  const stream = await t.container.family.assistant.createUiStream({ actor, studentId, turns: [{ role: "parent", text }] });
  const reader = stream.getReader();
  const chunks: UIMessageChunk[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const data = (type: string) => chunks.filter((c) => c.type === type).map((c) => (c as unknown as { data: AnyCard }).data);
  return { cards: data("data-card"), notices: data("data-notice"), text: chunks.filter((c) => c.type === "text-delta").map((c) => (c as { delta: string }).delta).join("") };
}

describe("Trợ lý gia đình – cá nhân hóa theo từng bé, phụ huynh dẫn dắt", () => {
  it("system prompt chứa hồ sơ của ĐÚNG bé (sở thích đã nhớ, bài học gần đây) và quy tắc phụ huynh dẫn dắt/Screen-Free", async () => {
    const model = fakeModel().respond(new AIMessage("Chào bố mẹ!"));
    await ask(model, "Chào bạn");
    const system = textOf(model.calls[0].messages[0].content);
    expect(system).toContain("Trần Gia Huy");
    expect(system).toContain("xe cứu hỏa");
    expect(system).toMatch(/Chuyến xe tình bạn/);
    expect(system).toMatch(/DẪN DẮT/);
    expect(system).toMatch(/không (nhìn màn hình|chẩn đoán)/i);
    expect(system).not.toContain("Nguyễn Minh Anh");
  });

  it("suggest_home_activity trả thẻ hoạt động cá nhân hóa (dùng sở thích đã nhớ), nội dung đồ thật không màn hình", async () => {
    await t.container.family.profiles.remember(huyParent(), t.ids.huyId, "Bé mê khủng long", "parent");
    const model = fakeModel().respondWithTools([{ name: "suggest_home_activity", args: { focus: "chỉ có tất và hộp giấy" } }]).respond(new AIMessage("Bố mẹ thử nhé."));
    const r = await ask(model, "Tối nay chơi gì với con? Nhà có tất và hộp giấy");
    const card = r.cards.find((c) => c.kind === "home-activity")!;
    expect(card.studentId).toBe(t.ids.huyId);
    expect(card.activity.whyForThisChild).toMatch(/khủng long/);
    expect(card.activity.steps.length).toBeGreaterThanOrEqual(3);
    expect(card.activity.materials.join(" ")).not.toMatch(/điện thoại|ipad|tivi|video/i);
  });

  it("get_child_progress và get_recent_lessons chỉ trả dữ liệu của chính bé, không có ghi chú của cô", async () => {
    const model = fakeModel().respondWithTools([{ name: "get_child_progress", args: {} }, { name: "get_recent_lessons", args: {} }]).respond(new AIMessage("Con đang tiến bộ ạ."));
    const r = await ask(model, "Con học được gì rồi?");
    const progress = r.cards.find((c) => c.kind === "child-progress")!;
    expect(progress.progress.map((p: { area: string }) => p.area)).toContain("social-emotional");
    const lessons = r.cards.find((c) => c.kind === "child-lessons")!;
    expect(lessons.lessons[0].gameName).toMatch(/Chuyến xe tình bạn/);
    const all = JSON.stringify(r.cards);
    expect(all).not.toMatch(/ngập ngừng|chỉ gật đầu|Nguyễn Minh Anh/);
  });

  it("save_child_memory ghi nhớ vào hồ sơ của bé và lượt sau dùng lại trong system prompt", async () => {
    const m1 = fakeModel().respondWithTools([{ name: "save_child_memory", args: { content: "Bé thích nghe kể chuyện trước giờ ngủ" } }]).respond(new AIMessage("Mình ghi nhớ rồi."));
    const r = await ask(m1, "Bé nhà mình thích nghe kể chuyện trước giờ ngủ");
    expect(r.cards.find((c) => c.kind === "notice")?.message).toContain("kể chuyện");
    const m2 = fakeModel().respond(new AIMessage("ok"));
    await ask(m2, "Gợi ý giúp mình");
    expect(textOf(m2.calls[0].messages[0].content)).toContain("nghe kể chuyện trước giờ ngủ");
  });

  it("BR-006: phụ huynh khác không thể hỏi về con người khác (403) và sự kiện được ghi AuditLog", async () => {
    await expect(ask(fakeModel().respond(new AIMessage("x")), "cho mình xem", otherParent(), t.ids.huyId)).rejects.toBeInstanceOf(PermissionError);
    expect(await t.container.prisma.auditLog.count({ where: { action: "access_denied", userId: t.ids.parentIds[1] } })).toBeGreaterThan(0);
    const teacherActor = { id: t.ids.teacherId, role: "teacher" as never, classId: t.ids.classId };
    await expect(ask(fakeModel().respond(new AIMessage("x")), "hi", teacherActor)).rejects.toBeInstanceOf(PermissionError);
  });

  it("ERR-NET-01: lỗi model được báo trong stream", async () => {
    const r = await ask(fakeModel().alwaysThrow(new Error("timeout")), "Chào");
    expect(r.notices[0]).toMatchObject({ code: "ERR-NET-01" });
  });

  it("cửa sổ hội thoại từ RAM trình duyệt được cắt theo ngân sách token, giữ tin mới nhất", () => {
    const turns = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? ("assistant" as const) : ("parent" as const), text: `${i} ` + "từ ".repeat(400) }));
    const msgs = turnsToMessages(turns);
    expect(msgs.length).toBeLessThan(30);
    expect(textOf(msgs.at(-1)!.content).startsWith("29 ")).toBe(true);
    expect(msgs.reduce((s, m) => s + estimateTokens(textOf(m.content)), 0)).toBeLessThanOrEqual(HISTORY_TOKEN_BUDGET);
  });
});
