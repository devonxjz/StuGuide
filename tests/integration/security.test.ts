import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { createTestContainer } from "../helpers/test-container";
import { sessionCookie } from "@/server/session";
import { signSession, getSessionSecret } from "@/server/session-token";
import { hashPassword } from "@/server/password";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as getPlan, PATCH as editPlan } from "@/app/api/plans/[id]/route";
import { POST as approve } from "@/app/api/plans/[id]/approve/route";
import { POST as review } from "@/app/api/plans/[id]/review/route";
import { GET as getCard, PATCH as patchCard } from "@/app/api/cards/[id]/route";
import { GET as cardStats } from "@/app/api/cards/[id]/stats/route";
import { GET as cardStream } from "@/app/api/cards/[id]/stream/route";
import { POST as memoryPost } from "@/app/api/memory/route";
import { POST as familyActivity } from "@/app/api/family/activity/route";
import { POST as familySessions } from "@/app/api/family/sessions/route";
import { POST as assessSave } from "@/app/api/assess/[planId]/route";
import { GET as exportReport } from "@/app/api/export/report/route";

type T = Awaited<ReturnType<typeof createTestContainer>>;
let t: T;
const OTHER_SCHOOL = { school: "school-b", cls: "class-b1", principal: "principal-b", teacher: "teacher-b" };

beforeAll(async () => {
  t = await createTestContainer();
  const db = t.container.prisma;
  await db.school.create({ data: { id: OTHER_SCHOOL.school, name: "Trường Mầm non Sen Hồng" } });
  await db.class.create({ data: { id: OTHER_SCHOOL.cls, name: "Lớp Chồi", ageGroup: "4-5y", ageLabel: "4–5 tuổi", schoolId: OTHER_SCHOOL.school } });
  await db.user.createMany({
    data: [
      { id: OTHER_SCHOOL.principal, fullName: "Cô Hiệu trưởng B", email: "hieutruong@senhong.edu.vn", role: "principal", schoolId: OTHER_SCHOOL.school, passwordHash: hashPassword("matkhau-b") },
      { id: OTHER_SCHOOL.teacher, fullName: "Cô giáo B", email: "cob@senhong.edu.vn", role: "teacher", schoolId: OTHER_SCHOOL.school },
    ],
  });
  await db.classTeacher.create({ data: { classId: OTHER_SCHOOL.cls, teacherId: OTHER_SCHOOL.teacher, isPrimary: true } });
  await db.auditLog.create({ data: { userId: OTHER_SCHOOL.principal, action: "login", details: "bí mật của trường B" } });
});

const cookieOf = (userId: string, sv = 0) => {
  const c = sessionCookie(userId, sv);
  return `${c.name}=${c.value}`;
};
const req = (url: string, init: { method?: string; body?: unknown; user?: string; cookie?: string; headers?: Record<string, string>; raw?: string } = {}) =>
  new NextRequest(`http://localhost${url}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(init.cookie ? { cookie: init.cookie } : init.user ? { cookie: cookieOf(init.user) } : {}),
      ...init.headers,
    },
    body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
const ctx = <P,>(params: P) => ({ params: Promise.resolve(params) as Promise<Record<string, string>> });
const status = async (r: Promise<Response>) => (await r).status;

describe("IDOR: giáo viên chỉ truy cập lớp mình (cùng trường cũng không được xem lớp khác)", () => {
  it("đọc giáo án của lớp khác → 403; chủ lớp → 200", async () => {
    const id = t.ids.sharedPlanId; // giáo án lớp B1 của cô Lan
    expect(await status(getPlan(req(`/api/plans/${id}`, { user: t.ids.teacher2Id }), ctx({ id })))).toBe(403);
    expect(await status(getPlan(req(`/api/plans/${id}`, { user: t.ids.teacherId }), ctx({ id })))).toBe(200);
  });

  it("thẻ phụ huynh, thống kê (có họ tên trẻ) và SSE của lớp khác → 403", async () => {
    const id = t.ids.cardId;
    for (const handler of [getCard, cardStats, cardStream]) {
      expect(await status(handler(req(`/api/cards/${id}`, { user: t.ids.teacher2Id }), ctx({ id })))).toBe(403);
    }
    const ok = await cardStats(req(`/api/cards/${id}/stats`, { user: t.ids.teacherId }), ctx({ id }));
    expect((await ok.json()).total).toBe(8);
  });

  it("sửa thẻ / sửa giáo án / phê duyệt bài của lớp khác → 403", async () => {
    const card = t.ids.cardId;
    expect(await status(patchCard(req(`/api/cards/${card}`, { method: "PATCH", user: t.ids.teacher2Id, body: { content: { greeting: "x", classSummary: "x", missionTitle: "x", duration: 5, eqQuestions: ["a", "b"], adultRole: "x" } } }), ctx({ id: card })))).toBe(403);
    const plan = (await t.container.services.lessonPlanner.create(
      { ageGroup: "4-5y", developmentArea: "physical", topic: "Vận động", materials: ["Rổ nhựa"], duration: 20, space: "indoor" },
      { id: t.ids.teacherId, role: "teacher", classId: t.ids.classId, schoolId: t.ids.schoolId },
    )).plan;
    expect(await status(editPlan(req(`/api/plans/${plan.id}`, { method: "PATCH", user: t.ids.teacher2Id, body: { section: "gameName", value: "Chiếm quyền" } }), ctx({ id: plan.id })))).toBe(403);
    expect(await status(approve(req(`/api/plans/${plan.id}/approve`, { method: "POST", user: t.ids.teacher2Id, body: {} }), ctx({ id: plan.id })))).toBe(403);
  });

  it("giáo viên không 'yêu cầu sửa lại' được (chỉ BGH) – kể cả bài của lớp khác", async () => {
    const id = t.ids.reviewPlanId; // bài lớp A2 đang chờ duyệt
    const r = await review(req(`/api/plans/${id}/review`, { method: "POST", user: t.ids.teacherId, body: { action: "request-changes" } }), ctx({ id }));
    expect([403, 409]).toContain(r.status);
    expect((await t.container.repos.lessonPlans.findById(id))!.status).toBe("needs_review");
  });
});

describe("Ranh giới trường (tenant): BGH chỉ thấy trường mình", () => {
  it("BGH trường khác không đọc/duyệt được giáo án, không xem được thống kê thẻ", async () => {
    const id = t.ids.reviewPlanId;
    expect(await status(getPlan(req(`/api/plans/${id}`, { user: OTHER_SCHOOL.principal }), ctx({ id })))).toBe(403);
    expect(await status(approve(req(`/api/plans/${id}/approve`, { method: "POST", user: OTHER_SCHOOL.principal, body: {} }), ctx({ id })))).toBe(403);
    expect(await status(cardStats(req(`/api/cards/${t.ids.cardId}/stats`, { user: OTHER_SCHOOL.principal }), ctx({ id: t.ids.cardId })))).toBe(403);
    expect((await t.container.repos.lessonPlans.findById(id))!.status).toBe("needs_review");
  });

  it("BGH trường khác không xem được hồ sơ bé", async () => {
    await expect(t.container.family.profiles.overview({ id: OTHER_SCHOOL.principal, role: "principal", schoolId: OTHER_SCHOOL.school }, t.ids.huyId)).rejects.toMatchObject({ status: 403 });
  });

  it("dashboard/báo cáo chỉ gồm dữ liệu và nhật ký của trường mình", async () => {
    const mine = await t.container.services.reports.dashboard({ id: t.ids.principalId, role: "principal", schoolId: t.ids.schoolId });
    expect(JSON.stringify(mine.auditLog)).not.toContain("bí mật của trường B");
    const theirs = await (await exportReport(req("/api/export/report", { user: OTHER_SCHOOL.principal }), ctx({}))).json();
    expect(theirs.totals.plans).toBe(0);
    expect(theirs.title).toContain("Sen Hồng");
  });

  it("KPI là số liệu đo được (không còn giả định 45 phút/giáo án)", async () => {
    const d = await t.container.services.reports.dashboard({ id: t.ids.principalId, role: "principal", schoolId: t.ids.schoolId });
    expect(d.kpis).not.toHaveProperty("hoursSavedPerTeacher");
    expect(typeof d.kpis.plansPerTeacher).toBe("number");
  });
});

describe("Phiên đăng nhập", () => {
  it("đăng xuất thu hồi phiên phía server: cookie cũ (kể cả bị lộ) mất hiệu lực ngay", async () => {
    const cookie = cookieOf(t.ids.principalId);
    expect(await status(exportReport(req("/api/export/report", { cookie }), ctx({})))).toBe(200);
    expect(await status(logout(req("/api/auth/logout", { method: "POST", cookie, body: {} }), ctx({})))).toBe(200);
    expect(await status(exportReport(req("/api/export/report", { cookie }), ctx({})))).toBe(401);
    // đăng nhập lại cấp cookie theo phiên bản mới
    const fresh = cookieOf(t.ids.principalId, 1);
    expect(await status(exportReport(req("/api/export/report", { cookie: fresh }), ctx({})))).toBe(200);
  });

  it("cookie hết hạn hoặc trỏ tới tài khoản không tồn tại → 401", async () => {
    const expired = signSession({ sub: t.ids.teacherId, exp: Math.floor(Date.now() / 1000) - 1 }, getSessionSecret());
    expect(await status(getPlan(req(`/api/plans/${t.ids.sharedPlanId}`, { cookie: `sg_session=${expired}` }), ctx({ id: t.ids.sharedPlanId })))).toBe(401);
    const ghost = signSession({ sub: "khong-ton-tai" }, getSessionSecret());
    expect(await status(getPlan(req(`/api/plans/${t.ids.sharedPlanId}`, { cookie: `sg_session=${ghost}` }), ctx({ id: t.ids.sharedPlanId })))).toBe(401);
  });

  it("dò mật khẩu: sai 5 lần thì khóa tạm tài khoản (429 + Retry-After), kể cả khi lần sau đúng; tài khoản khác không bị ảnh hưởng", async () => {
    const go = (username: string, password: string) => login(req("/api/auth/login", { method: "POST", body: { username, password } }), ctx({}));
    for (let i = 0; i < 5; i++) expect((await go("hieutruong@senhong.edu.vn", `sai-${i}`)).status).toBe(401);
    const locked = await go("hieutruong@senhong.edu.vn", "matkhau-b");
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await go("minh@hoamai.edu.vn", "stuguide")).status).toBe(200);
    const logs = JSON.stringify(await t.container.prisma.auditLog.findMany({ where: { action: { in: ["login_failed", "login_locked"] } } }));
    expect(logs).not.toContain("hieutruong@senhong.edu.vn"); // nhật ký không lưu chuỗi người dùng gõ
    expect(logs).not.toContain("sai-0");
  });

  it("đăng nhập đúng xóa bộ đếm lần sai", async () => {
    const go = (password: string) => login(req("/api/auth/login", { method: "POST", body: { username: "thu@hoamai.edu.vn", password } }), ctx({}));
    for (let i = 0; i < 4; i++) await go("sai");
    expect((await go("stuguide")).status).toBe(200);
    for (let i = 0; i < 4; i++) expect((await go("sai")).status).toBe(401);
    expect((await go("stuguide")).status).toBe(200);
  });
});

describe("Kiểm tra đầu vào ở route (lớp 2)", () => {
  it("trường lạ trong body → 400 (chống mass assignment)", async () => {
    const r = await memoryPost(req("/api/memory", { method: "POST", user: t.ids.teacherId, body: { content: "Lớp thích hát", userId: t.ids.teacher2Id } }), ctx({}));
    expect(r.status).toBe(400);
    expect((await r.json()).error.message).toMatch(/userId/);
  });

  it("prototype pollution trong JSON → 400", async () => {
    const r = await memoryPost(req("/api/memory", { method: "POST", user: t.ids.teacherId, raw: '{"content":"Lớp thích hát","__proto__":{"role":"principal"}}' }), ctx({}));
    expect(r.status).toBe(400);
  });

  it("body vượt giới hạn byte → 413; sai Content-Type → 415; JSON hỏng → 400", async () => {
    expect(await status(memoryPost(req("/api/memory", { method: "POST", user: t.ids.teacherId, body: { content: "x".repeat(70 * 1024) } }), ctx({})))).toBe(413);
    expect(await status(memoryPost(req("/api/memory", { method: "POST", user: t.ids.teacherId, raw: "content=x", headers: { "content-type": "application/x-www-form-urlencoded" } }), ctx({})))).toBe(415);
    expect(await status(memoryPost(req("/api/memory", { method: "POST", user: t.ids.teacherId, raw: "{oops" }), ctx({})))).toBe(400);
  });

  it("tham số đường dẫn sai định dạng → 400, không chạm DB", async () => {
    for (const id of ["../../etc/passwd", "a b", "x".repeat(65), "1;DROP"]) {
      expect(await status(getPlan(req("/api/plans/x", { user: t.ids.teacherId }), ctx({ id })))).toBe(400);
    }
  });

  it("ký tự vô hình/điều khiển bị loại trước khi lưu", async () => {
    const r = await memoryPost(req("/api/memory", { method: "POST", user: t.ids.teacherId, body: { content: "Lớp​ thích‮ hát\u0000 múa" } }), ctx({}));
    expect((await r.json()).memory.content).toBe("Lớp thích hát múa");
  });

  it("đánh giá: chỉ số tiêu chí vượt số tiêu chí của checklist → 400; ghi chú có nhãn chẩn đoán được làm sạch", async () => {
    const actor = { id: t.ids.teacherId, role: "teacher" as const, classId: t.ids.classId, schoolId: t.ids.schoolId };
    const { checklist, criteria } = await t.container.services.assessment.createChecklist(t.ids.sharedPlanId, actor);
    const entry = { studentId: t.ids.huyId, overallRating: "achieved", ratings: { [String(criteria.length)]: "achieved" } };
    const bad = await assessSave(req(`/api/assess/${t.ids.sharedPlanId}`, { method: "POST", user: t.ids.teacherId, body: { checklistId: checklist.id, entries: [entry] } }), ctx({ planId: t.ids.sharedPlanId }));
    expect(bad.status).toBe(400);
    const ok = await assessSave(
      req(`/api/assess/${t.ids.sharedPlanId}`, { method: "POST", user: t.ids.teacherId, body: { checklistId: checklist.id, entries: [{ ...entry, ratings: { "0": "achieved" }, note: "Bé tăng động" }] } }),
      ctx({ planId: t.ids.sharedPlanId }),
    );
    expect(ok.status).toBe(200);
    const saved = await t.container.prisma.studentAssessment.findFirst({ where: { checklistId: checklist.id, studentId: t.ids.huyId } });
    expect(saved?.note).not.toMatch(/tăng động/);
  });
});

describe("Giới hạn tần suất tác vụ AI", () => {
  it("mỗi tài khoản tối đa 20 yêu cầu AI/phút, sau đó 429 có Retry-After", async () => {
    // mỗi lượt một IP khác nhau để chỉ đo giới hạn theo tài khoản (trần quota theo IP có test riêng ở device-quota.test.ts)
    let n = 0;
    const call = () =>
      familyActivity(req("/api/family/activity", { method: "POST", user: "demo-parent-2", body: { studentId: t.ids.otherStudentId }, headers: { "x-forwarded-for": `192.0.2.${++n}` } }), ctx({}));
    const codes: number[] = [];
    for (let i = 0; i < 21; i++) codes.push((await call()).status);
    expect(codes.slice(0, 20).every((c) => c !== 429)).toBe(true);
    const last = await call();
    expect(last.status).toBe(429);
    expect(last.headers.get("retry-after")).toBeTruthy();
  });
});

describe("Cổng phê duyệt: còn vi phạm luật bắt buộc thì không duyệt được (kể cả bấm tay)", () => {
  it("cô xóa cảnh báo mép sắc của vỏ hộp sữa → phê duyệt bị chặn 409 kèm lý do; sửa lại đủ cảnh báo → duyệt được", async () => {
    const actor = { id: t.ids.teacherId, role: "teacher" as const, classId: t.ids.classId, schoolId: t.ids.schoolId };
    const { plan } = await t.container.services.lessonPlanner.create(
      { ageGroup: "4-5y", developmentArea: "physical", topic: "Tái chế", materials: ["Vỏ hộp sữa tái chế"], duration: 20, space: "indoor" },
      actor,
    );
    await t.container.services.lessonPlanner.editSection(plan.id, "safetyWarnings", [{ level: "info", material: "Sân chơi", description: "Dọn gọn", ruleRef: "" }], actor);
    const ip = { "x-forwarded-for": "192.0.2.200" };
    const blocked = await approve(req(`/api/plans/${plan.id}/approve`, { method: "POST", user: t.ids.teacherId, body: {}, headers: ip }), ctx({ id: plan.id }));
    expect(blocked.status).toBe(409);
    expect((await blocked.json()).error.message).toMatch(/Vỏ hộp sữa tái chế/);

    await t.container.services.lessonPlanner.editSection(plan.id, "safetyWarnings", [{ level: "warning", material: "Vỏ hộp sữa", description: "Kiểm tra mép sắc", ruleRef: "45/2021/TT-BGDĐT" }], actor);
    expect(await status(approve(req(`/api/plans/${plan.id}/approve`, { method: "POST", user: t.ids.teacherId, body: {}, headers: ip }), ctx({ id: plan.id })))).toBe(200);
  });
});

describe("Phiên học ở nhà (sendBeacon)", () => {
  const beacon = (body: unknown) => familySessions(req("/api/family/sessions", { method: "POST", user: "demo-parent-1", body }), ctx({}));
  const payload = (sessionId: string) => ({
    sessionId,
    studentId: t.ids.huyId,
    events: [{ seq: 1, type: "view", at: new Date().toISOString() }],
    transcript: [{ role: "parent", text: "Bé mê khủng long" }, { role: "assistant", text: "Hay quá" }],
  });

  it("hai beacon cùng lúc cho phiên mới (visibilitychange + pagehide) đều thành công, chỉ có một bản ghi", async () => {
    const [a, b] = await Promise.all([beacon(payload("sess-race-0001")), beacon(payload("sess-race-0001"))]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await t.container.prisma.learningSession.count({ where: { id: "sess-race-0001" } })).toBe(1);
  });

  it("chắt lọc chỉ chạy khi có dữ liệu mới; gửi lại y nguyên thì không chắt lọc lại", async () => {
    await beacon(payload("sess-once-0001"));
    await new Promise((r) => setTimeout(r, 30));
    expect((await t.container.prisma.learningSession.findUnique({ where: { id: "sess-once-0001" } }))?.distilled).toBe(true);
    const again = await t.container.family.sessions.ingest({ id: "demo-parent-1", role: "parent" }, payload("sess-once-0001"));
    expect(again.needsDistill).toBe(false);
    expect(await t.container.family.sessions.distill("sess-once-0001")).toEqual({ skipped: true });
  });

  it("phiên của phụ huynh khác: không ghi đè được", async () => {
    const r = await familySessions(req("/api/family/sessions", { method: "POST", user: "demo-parent-2", body: { ...payload("sess-once-0001"), studentId: t.ids.otherStudentId } }), ctx({}));
    expect(r.status).toBe(403);
  });
});

describe("Trí nhớ của bé", () => {
  it("AI chắt lọc lại cùng một ý (diễn đạt hơi khác) không tạo bản gần trùng", async () => {
    const p = t.container.family.profiles;
    const a = await p.addMemory(t.ids.huyId, "Bé rất thích khủng long bạo chúa", "ai-session", null);
    const b = await p.addMemory(t.ids.huyId, "Bé rất thích khủng long bạo chúa!", "ai-session", null);
    expect(b.id).toBe(a.id);
  });

  it("vượt 30 mục: bỏ điều AI chắt lọc trước, giữ điều phụ huynh tự nhập", async () => {
    const p = t.container.family.profiles;
    const sid = t.ids.otherStudentId;
    const parentOwn = await p.addMemory(sid, "Mẹ kể: bé thích hát ru buổi tối", "parent", "demo-parent-2");
    const things = ["xe", "búp bê", "bóng", "khối gỗ", "tranh", "đất nặn", "sách", "trống", "diều", "cát", "nước", "lá", "hoa", "mèo", "chó", "cá", "chim", "thuyền", "tàu", "máy bay", "nhạc", "múa", "kể chuyện", "xếp hình", "tô màu", "đồ hàng", "bác sĩ", "nấu ăn", "trốn tìm", "nhảy dây", "đá cầu", "bơi"];
    for (const x of things) await p.addMemory(sid, `AI ghi: ${x}`, "ai-session", null);
    const ids = (await t.container.repos.children.memories(sid)).map((m) => m.id);
    expect(ids).toHaveLength(30);
    expect(ids).toContain(parentOwn.id);
  });

  it("link phản hồi theo đúng bé: phụ huynh có hai con không bị lẫn link", async () => {
    await t.container.prisma.studentParent.create({ data: { studentId: t.ids.otherStudentId, parentId: "demo-parent-1" } });
    const link = await t.container.repos.parentCards.tokenFor({ parentId: "demo-parent-1", studentId: t.ids.huyId });
    expect(link?.studentId).toBe(t.ids.huyId);
    expect(await t.container.repos.parentCards.tokenFor({ parentId: "demo-parent-1", studentId: t.ids.otherStudentId })).toBeNull();
  });
});
