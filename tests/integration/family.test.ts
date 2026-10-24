import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestContainer } from "../helpers/test-container";
import { PermissionError } from "@/core/guardrails";
import { NotFoundError } from "@/core/errors";
import type { SessionPayload } from "@/core/schemas/family.schema";

type T = Awaited<ReturnType<typeof createTestContainer>>;
let t: T;

beforeAll(async () => {
  t = await createTestContainer();
});
afterAll(async () => t.container.prisma.$disconnect());

const huyParent = () => ({ id: t.ids.huyParentId, role: "parent" as const });
const otherParent = () => ({ id: t.ids.parentIds[1], role: "parent" as const });
const teacher = () => ({ id: t.ids.teacherId, role: "teacher" as const, classId: t.ids.classId });
const teacher2 = () => ({ id: t.ids.teacher2Id, role: "teacher" as const, classId: t.ids.class2Id });

describe("ChildProfileService – cổng phụ huynh và cá nhân hóa theo từng bé (BR-006)", () => {
  it("phụ huynh liệt kê đúng con của mình", async () => {
    const kids = await t.container.family.profiles.childrenOf(huyParent());
    expect(kids.map((k) => k.fullName)).toEqual(["Trần Gia Huy"]);
  });

  it("tổng quan: bài đang học (đã chia sẻ), tiến bộ theo mảng chỉ từ đánh giá của chính bé", async () => {
    const o = await t.container.family.profiles.overview(huyParent(), t.ids.huyId);
    expect(o.student.fullName).toBe("Trần Gia Huy");
    expect(o.recentLessons.length).toBeGreaterThanOrEqual(3);
    expect(o.recentLessons.every((l) => l.gameName)).toBe(true);
    expect(o.recentLessons[0].gameName).toMatch(/Chuyến xe tình bạn/);
    expect(o.recentLessons[0].missionTitle).toBeTruthy();
    const areas = o.progress.map((p) => p.area);
    expect(areas).toEqual(expect.arrayContaining(["cognitive", "physical", "social-emotional"]));
    expect(o.progress.find((p) => p.area === "social-emotional")!.total).toBe(1);
    expect(JSON.stringify(o)).not.toContain("Nguyễn Minh Anh"); // không lộ bé khác
  });

  it("không lộ ghi chú của cô và cảnh báo quan sát sâu cho phụ huynh (tránh dán nhãn)", async () => {
    const o = await t.container.family.profiles.overview(huyParent(), t.ids.huyId);
    const text = JSON.stringify(o);
    expect(text).not.toMatch(/ngập ngừng|quan sát sâu|chỉ ngồi chơi một mình|gật đầu không nói/i);
  });

  it("phụ huynh khác bị chặn và ghi AuditLog; giáo viên lớp khác bị chặn; cô chủ nhiệm xem được", async () => {
    await expect(t.container.family.profiles.overview(otherParent(), t.ids.huyId)).rejects.toBeInstanceOf(PermissionError);
    expect(await t.container.prisma.auditLog.count({ where: { action: "access_denied", userId: t.ids.parentIds[1] } })).toBe(1);
    await expect(t.container.family.profiles.overview(teacher2(), t.ids.huyId)).rejects.toBeInstanceOf(PermissionError);
    await expect(t.container.family.profiles.overview(teacher(), t.ids.huyId)).resolves.toBeTruthy();
    await expect(t.container.family.profiles.overview(huyParent(), "khong-co")).rejects.toBeInstanceOf(PermissionError);
  });

  it("trí nhớ của bé: ghi, loại trùng, làm sạch từ dán nhãn, giới hạn, xóa; người ngoài không xóa được", async () => {
    const p = t.container.family.profiles;
    const a = await p.remember(huyParent(), t.ids.huyId, "Bé rất thích khủng long", "parent");
    await p.remember(huyParent(), t.ids.huyId, " bé rất thích khủng long ", "parent");
    const tagged = await p.remember(huyParent(), t.ids.huyId, "Bé hơi tăng động lúc chiều", "parent");
    expect(tagged.content).not.toMatch(/tăng động/);
    const list = await p.memories(huyParent(), t.ids.huyId);
    expect(list.filter((m) => /khủng long/.test(m.content))).toHaveLength(1);
    await expect(p.forget(otherParent(), a.id)).rejects.toBeInstanceOf(PermissionError);
    await p.forget(huyParent(), a.id);
    expect((await p.memories(huyParent(), t.ids.huyId)).map((m) => m.id)).not.toContain(a.id);
    for (let i = 0; i < 40; i++) await p.remember(huyParent(), t.ids.huyId, `Sở thích số ${i}`, "parent");
    expect((await p.memories(huyParent(), t.ids.huyId)).length).toBeLessThanOrEqual(30);
  });

  it("profileForAI: khối ngữ cảnh cho AI gồm tuổi, điều đã nhớ, điểm mạnh, mảng đang rèn, bài gần đây; không chứa nhãn", async () => {
    await t.container.family.profiles.remember(huyParent(), t.ids.huyId, "Bé thích xe cứu hỏa", "parent");
    const text = await t.container.family.profiles.profileForAI(t.ids.huyId);
    expect(text).toContain("Trần Gia Huy");
    expect(text).toContain("4–5 tuổi");
    expect(text).toContain("xe cứu hỏa");
    expect(text).toMatch(/Chuyến xe tình bạn/);
    expect(text).toMatch(/đang rèn/i);
    expect(text).not.toMatch(/tự kỷ|tăng động|bệnh/i);
    expect(text).not.toContain("Nguyễn Minh Anh");
  });
});

describe("LearningSessionService – bộ nhớ ngắn hạn (RAM trình duyệt) được ghi vào DB khi đóng tab", () => {
  const payload = (over: Partial<SessionPayload> = {}): SessionPayload => ({
    sessionId: "sess-aaaa1111",
    studentId: t?.ids?.huyId ?? "",
    events: [
      { seq: 1, type: "view", at: new Date().toISOString() },
      { seq: 2, type: "activity-step", at: new Date().toISOString(), data: { step: 1 } },
    ],
    transcript: [
      { role: "parent", text: "Con mình mê khủng long, gợi ý trò chơi tối nay nhé" },
      { role: "assistant", text: "Mình gợi ý trò chơi 'Khủng long tìm trứng'." },
    ],
    ...over,
  });

  it("ghi phiên mới, idempotent khi gửi lại; chỉ nhận seq mới; transcript dài hơn thì thay thế", async () => {
    const svc = t.container.family.sessions;
    const a = await svc.ingest(huyParent(), payload({ studentId: t.ids.huyId }));
    expect(a.lastSeq).toBe(2);
    await svc.ingest(huyParent(), payload({ studentId: t.ids.huyId })); // gửi lại y hệt
    const more = payload({ studentId: t.ids.huyId });
    more.events.push({ seq: 3, type: "reaction", at: new Date().toISOString(), data: { emoji: "😀" } });
    more.transcript.push({ role: "parent", text: "Cảm ơn nhé" });
    const b = await svc.ingest(huyParent(), more);
    expect(b.lastSeq).toBe(3);
    const row = await t.container.prisma.learningSession.findUnique({ where: { id: "sess-aaaa1111" } });
    expect((row!.events as unknown[]).length).toBe(3);
    expect((row!.transcript as unknown[]).length).toBe(3);
    expect(row!.endedAt).not.toBeNull();
    expect(await t.container.prisma.learningSession.count({ where: { id: "sess-aaaa1111" } })).toBe(1);
  });

  it("chắt lọc phiên thành trí nhớ dài hạn của bé, làm sạch nhãn và loại trùng", async () => {
    const svc = t.container.family.sessions;
    await svc.distill("sess-aaaa1111");
    const mems = await t.container.family.profiles.memories(huyParent(), t.ids.huyId);
    expect(mems.some((m) => m.source === "ai-session" && /khủng long/i.test(m.content))).toBe(true);
    expect(mems.some((m) => /tăng động/.test(m.content))).toBe(false);
    // nhãn chẩn đoán bị bỏ hẳn, không để lại bản thay chữ vô nghĩa
    expect(mems.some((m) => m.source === "ai-session" && /Cần quan tâm rèn luyện thêm/.test(m.content))).toBe(false);
    const row = await t.container.prisma.learningSession.findUnique({ where: { id: "sess-aaaa1111" } });
    expect(row!.distilled).toBe(true);
    expect(row!.summary).toMatch(/khủng long/i);
    const before = (await t.container.family.profiles.memories(huyParent(), t.ids.huyId)).length;
    await svc.distill("sess-aaaa1111");
    expect((await t.container.family.profiles.memories(huyParent(), t.ids.huyId)).length).toBe(before);
  });

  it("phụ huynh không ghi được phiên cho con người khác hoặc chiếm phiên của người khác", async () => {
    const svc = t.container.family.sessions;
    await expect(svc.ingest(otherParent(), payload({ studentId: t.ids.huyId, sessionId: "sess-bbbb2222" }))).rejects.toBeInstanceOf(PermissionError);
    await expect(svc.ingest(otherParent(), payload({ studentId: t.ids.otherStudentId, sessionId: "sess-aaaa1111" }))).rejects.toBeInstanceOf(PermissionError);
    await expect(svc.ingest(teacher(), payload({ studentId: t.ids.huyId, sessionId: "sess-cccc3333" }))).rejects.toBeInstanceOf(PermissionError);
  });

  it("phiên không có nội dung thì bỏ qua chắt lọc; phiên lạ → NotFound", async () => {
    const svc = t.container.family.sessions;
    await svc.ingest(huyParent(), payload({ studentId: t.ids.huyId, sessionId: "sess-empty999", events: [{ seq: 1, type: "view", at: new Date().toISOString() }], transcript: [] }));
    expect(await svc.distill("sess-empty999")).toEqual({ skipped: true });
    await expect(svc.distill("khong-co-phien")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("ingest tự kích hoạt chắt lọc nền khi bật autoDistill", async () => {
    const svc = t.container.family.sessions;
    await svc.ingest(huyParent(), payload({ studentId: t.ids.huyId, sessionId: "sess-dddd4444", transcript: [{ role: "parent", text: "Bé thích vẽ bằng bút sáp" }, { role: "assistant", text: "Hay quá" }] }), { distillNow: true });
    const mems = await t.container.family.profiles.memories(huyParent(), t.ids.huyId);
    expect(mems.some((m) => m.source === "ai-session")).toBe(true);
  });
});
