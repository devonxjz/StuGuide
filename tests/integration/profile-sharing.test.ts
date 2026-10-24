import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AIMessage } from "@langchain/core/messages";
import { fakeModel } from "@langchain/core/testing";
import { createTestContainer } from "../helpers/test-container";
import { PermissionError } from "@/core/guardrails";
import type { UIMessageChunk } from "ai";

type T = Awaited<ReturnType<typeof createTestContainer>>;
let t: T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- thẻ kết quả đa hình
type AnyCard = { kind: string } & Record<string, any>;

beforeAll(async () => {
  t = await createTestContainer();
});
afterAll(async () => t.container.prisma.$disconnect());

const parent = (i: number) => ({ id: t.ids.parentIds[i], role: "parent" as const });
const teacher = () => ({ id: t.ids.teacherId, role: "teacher" as const, classId: t.ids.classId });
const teacher2 = () => ({ id: t.ids.teacher2Id, role: "teacher" as const, classId: t.ids.class2Id });
const minhAnh = () => t.ids.otherStudentId; // bé thứ 2, mặc định CHƯA chia sẻ

describe("Đồng ý chia sẻ hồ sơ bé với cô giáo (Nghị định 13)", () => {
  it("mặc định chưa chia sẻ: cô không đọc được hồ sơ; Gia Huy đã được phụ huynh đồng ý trong dữ liệu mẫu", async () => {
    const p = t.container.family.profiles;
    expect(await p.teacherView(teacher(), minhAnh())).toEqual({ shared: false, student: expect.objectContaining({ fullName: "Nguyễn Minh Anh" }) });
    const huy = await p.teacherView(teacher(), t.ids.huyId);
    expect(huy.shared).toBe(true);
    if (huy.shared) expect(huy.memories.map((m) => m.content).join(" ")).toMatch(/xe cứu hỏa/);
  });

  it("chỉ phụ huynh của bé bật/tắt được; bật xong cô đọc được, thu hồi thì cô mất quyền ngay; có AuditLog", async () => {
    const p = t.container.family.profiles;
    await p.remember(parent(1), minhAnh(), "Bé mê công chúa", "parent");
    await expect(p.setSharing(teacher(), minhAnh(), true)).rejects.toBeInstanceOf(PermissionError);
    await expect(p.setSharing(parent(0), minhAnh(), true)).rejects.toBeInstanceOf(PermissionError); // phụ huynh bé khác

    await p.setSharing(parent(1), minhAnh(), true);
    const on = await p.teacherView(teacher(), minhAnh());
    expect(on.shared).toBe(true);
    if (on.shared) expect(on.memories.map((m) => m.content)).toContain("Bé mê công chúa");
    expect((await p.overview(parent(1), minhAnh())).sharedWithTeacher).toBe(true);

    await p.setSharing(parent(1), minhAnh(), false);
    expect((await p.teacherView(teacher(), minhAnh())).shared).toBe(false);
    const logs = await t.container.prisma.auditLog.findMany({ where: { action: { in: ["share_profile", "revoke_profile"] }, target: minhAnh() } });
    expect(logs.map((l) => l.action).sort()).toEqual(["revoke_profile", "share_profile"]);
  });

  it("cô lớp khác không đọc được dù phụ huynh đã đồng ý; phụ huynh không dùng được góc nhìn của cô", async () => {
    const p = t.container.family.profiles;
    await expect(p.teacherView(teacher2(), t.ids.huyId)).rejects.toBeInstanceOf(PermissionError);
    await expect(p.teacherView(parent(0), t.ids.huyId)).rejects.toBeInstanceOf(PermissionError);
  });

  it("cô chỉ thấy điều đã ghi nhớ về sở thích, KHÔNG thấy tóm tắt từng phiên dùng ở nhà hay nội dung hội thoại của phụ huynh", async () => {
    await t.container.prisma.learningSession.create({
      data: { id: "sess-secret-1", studentId: t.ids.huyId, parentId: t.ids.huyParentId, events: [], transcript: [{ role: "parent", text: "bí mật gia đình" }], summary: "Phiên riêng tư của gia đình", lastSeq: 0 },
    });
    const v = await t.container.family.profiles.teacherView(teacher(), t.ids.huyId);
    expect(JSON.stringify(v)).not.toMatch(/Phiên riêng tư|bí mật gia đình/);
    const text = await t.container.family.profiles.profileForTeacher(t.ids.huyId);
    expect(text).not.toMatch(/Phiên riêng tư|bí mật gia đình|Những lần dùng gần đây ở nhà/);
    expect(text).toContain("Trần Gia Huy");
  });
});

describe("Trợ lý của giáo viên: công cụ get_child_profile", () => {
  const textOf = (c: unknown): string => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b && typeof b === "object" && "text" in b ? String((b as { text: unknown }).text) : "")).join("") : "");

  async function ask(model: ReturnType<typeof fakeModel>, text: string, conv: string) {
    t.setChatModel(model);
    const msg = { id: crypto.randomUUID(), role: "user" as const, parts: [{ type: "text" as const, text }] };
    const reader = (await t.container.chat.createUiStream({ conversationId: conv, message: msg, actor: teacher() })).getReader();
    const chunks: UIMessageChunk[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const cards = chunks.filter((c) => c.type === "data-card").map((c) => (c as unknown as { data: AnyCard }).data);
    return { cards, chunks };
  }

  it("bé đã được đồng ý: trả hồ sơ cá nhân hóa (sở thích) cho cô", async () => {
    const model = fakeModel().respondWithTools([{ name: "get_child_profile", args: { studentName: "Gia Huy" } }]).respond(new AIMessage("Mình đã xem hồ sơ của Huy."));
    const r = await ask(model, "Gợi ý hoạt động riêng cho bé Gia Huy", "tc-1");
    const card = r.cards.find((c) => c.kind === "knowledge")!;
    expect(JSON.stringify(card.items)).toMatch(/xe cứu hỏa/);
    expect(textOf(model.calls[1].messages.at(-1)!.content)).toMatch(/xe cứu hỏa/); // LLM nhận được nội dung hồ sơ
  });

  it("bé chưa được đồng ý: AI nhận thông báo rõ ràng, không có dữ liệu hồ sơ", async () => {
    const model = fakeModel().respondWithTools([{ name: "get_child_profile", args: { studentName: "Minh Anh" } }]).respond(new AIMessage("Phụ huynh chưa đồng ý."));
    const r = await ask(model, "Gợi ý hoạt động riêng cho bé Minh Anh", "tc-2");
    expect(r.cards.find((c) => c.kind === "notice")?.message).toMatch(/chưa đồng ý chia sẻ/);
    expect(JSON.stringify(r.cards)).not.toMatch(/công chúa/);
    expect(textOf(model.calls[1].messages.at(-1)!.content)).toMatch(/chưa đồng ý/);
  });

  it("tên không có trong lớp hoặc trùng nhiều bé: báo để cô nói rõ hơn", async () => {
    const m1 = fakeModel().respondWithTools([{ name: "get_child_profile", args: { studentName: "Bé không tồn tại" } }]).respond(new AIMessage("ok"));
    expect((await ask(m1, "xem bé Không Tồn Tại", "tc-3")).cards.find((c) => c.kind === "notice")?.message).toMatch(/không tìm thấy/i);
    const m2 = fakeModel().respondWithTools([{ name: "get_child_profile", args: { studentName: "Bảo" } }]).respond(new AIMessage("ok"));
    expect((await ask(m2, "xem bé Bảo", "tc-4")).cards.find((c) => c.kind === "notice")?.message).toMatch(/nhiều bé|nói rõ/i);
  });
});
