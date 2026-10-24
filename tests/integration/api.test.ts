import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { createTestContainer } from "../helpers/test-container";
import { sessionCookie } from "@/server/session";
import { existsSync } from "node:fs";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as chat } from "@/app/api/chat/route";
import { POST as approve } from "@/app/api/plans/[id]/approve/route";
import { PATCH as editPlan } from "@/app/api/plans/[id]/route";
import { GET as parentView } from "@/app/api/parent/[token]/route";
import { POST as feedback } from "@/app/api/feedback/route";
import { GET as exportReport } from "@/app/api/export/report/route";
import { GET as cardStream } from "@/app/api/cards/[id]/stream/route";
import { POST as familyChat } from "@/app/api/family/chat/route";
import { POST as familySessions } from "@/app/api/family/sessions/route";
import { POST as familySharing } from "@/app/api/family/sharing/route";
import { POST as familyActivity } from "@/app/api/family/activity/route";
import { POST as familyMemoryPost } from "@/app/api/family/memory/route";
import { DELETE as familyMemoryDel } from "@/app/api/family/memory/[id]/route";
import { GET as LIST_CONV } from "@/app/api/conversations/route";
import { GET as GET_CONV, DELETE as DEL_CONV } from "@/app/api/conversations/[id]/route";
import { GET as memoryGet, POST as memoryPost } from "@/app/api/memory/route";
import { DELETE as memoryDelete } from "@/app/api/memory/[id]/route";
import { AIMessage } from "@langchain/core/messages";
import { fakeModel } from "@langchain/core/testing";

let ids: Awaited<ReturnType<typeof createTestContainer>>["ids"];
let prisma: Awaited<ReturnType<typeof createTestContainer>>["container"]["prisma"];
let setChatModel: Awaited<ReturnType<typeof createTestContainer>>["setChatModel"];

beforeAll(async () => {
  const t = await createTestContainer();
  ids = t.ids;
  prisma = t.container.prisma;
  setChatModel = t.setChatModel;
});

const as = (userId?: string): Record<string, string> => {
  const c = userId ? sessionCookie(userId) : null;
  return c ? { cookie: `${c.name}=${c.value}` } : {};
};
const req = (url: string, init: { method?: string; body?: unknown; user?: string } = {}) =>
  new NextRequest(`http://localhost${url}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", ...as(init.user) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
const ctx = <P,>(params: P) => ({ params: Promise.resolve(params) });

describe("auth (acceptance #7) – chỉ đăng nhập thật", () => {
  it("không còn cửa đăng nhập demo không mật khẩu (route và nút Role Switcher đã gỡ)", () => {
    expect(existsSync("src/app/api/auth/demo/route.ts")).toBe(false);
    expect(existsSync("src/components/shared/role-switcher.tsx")).toBe(false);
  });

  it("phiên phụ huynh không dùng được route của GV/BGH", async () => {
    expect((await exportReport(req("/api/export/report", { user: "demo-parent-1" }), ctx({}))).status).toBe(403);
    expect((await chat(req("/api/chat", { method: "POST", user: "demo-parent-1", body: { id: "abcdefgh", message: {} } }), ctx({}))).status).toBe(403);
  });

  it("đăng nhập bằng mật khẩu cho cả 3 vai trò: email (GV/BGH) hoặc số điện thoại (phụ huynh)", async () => {
    const go = (username: string, password: string) => login(req("/api/auth/login", { method: "POST", body: { username, password } }), ctx({}));
    const t = await go("lan@hoamai.edu.vn", "stuguide");
    expect((await t.json()).redirect).toBe("/teacher");
    expect((await (await go("LAN@hoamai.edu.vn", "stuguide")).json()).redirect).toBe("/teacher"); // không phân biệt hoa thường
    expect((await (await go("minh@hoamai.edu.vn", "stuguide")).json()).redirect).toBe("/principal");
    const p = await go("0900000001", "stuguide");
    expect((await p.json()).redirect).toBe("/family");
    expect(p.headers.get("set-cookie")).toMatch(/sg_session=v2\.[\w-]+\.[\w-]+;.*HttpOnly/i);
  });

  it("sai mật khẩu / tài khoản lạ / tài khoản chưa đặt mật khẩu → 401 cùng một thông điệp, có nhật ký, không lộ tài khoản nào tồn tại", async () => {
    const go = (username: string, password: string) => login(req("/api/auth/login", { method: "POST", body: { username, password } }), ctx({}));
    const wrong = await go("lan@hoamai.edu.vn", "sai-mat-khau");
    const unknown = await go("khong-co@hoamai.edu.vn", "stuguide");
    const phoneWrong = await go("0900000001", "123456"); // OTP cũ không còn tác dụng
    for (const r of [wrong, unknown, phoneWrong]) expect(r.status).toBe(401);
    expect((await wrong.json()).error.message).toBe((await unknown.json()).error.message);
    await prisma.user.update({ where: { id: "demo-parent-3" }, data: { passwordHash: null } });
    expect((await go("0900000003", "stuguide")).status).toBe(401);
    expect(await prisma.auditLog.count({ where: { action: "login_failed" } })).toBeGreaterThanOrEqual(4);
    expect(JSON.stringify(await prisma.auditLog.findMany({ where: { action: "login_failed" } }))).not.toContain("sai-mat-khau");
  });

  it("mật khẩu được băm trong DB, không lưu bản rõ", async () => {
    const u = await prisma.user.findUnique({ where: { id: "demo-teacher-lan" } });
    expect(u!.passwordHash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(u!.passwordHash).not.toContain("stuguide");
  });
});

describe("RBAC trên API (spec mục 13)", () => {
  it("chưa đăng nhập → 401; BGH không dùng được chatbot → 403", async () => {
    expect((await chat(req("/api/chat", { method: "POST", body: { id: "abcdefgh", message: {} } }), ctx({}))).status).toBe(401);
    expect((await chat(req("/api/chat", { method: "POST", body: { id: "abcdefgh", message: {} }, user: ids.principalId }), ctx({}))).status).toBe(403);
  });

  it("giáo viên không xuất được báo cáo kiểm định; BGH xuất được và có audit", async () => {
    expect((await exportReport(req("/api/export/report", { user: ids.teacherId }), ctx({}))).status).toBe(403);
    const ok = await exportReport(req("/api/export/report", { user: ids.principalId }), ctx({}));
    expect(ok.status).toBe(200);
    expect((await ok.json()).title).toMatch(/Báo cáo/);
  });

  it("cookie bị sửa không được chấp nhận", async () => {
    for (const value of ["demo-principal-minh.fake", "v2.eyJzdWIiOiJkZW1vLXByaW5jaXBhbC1taW5oIn0.fake"]) {
      const forged = new NextRequest("http://localhost/api/export/report", { headers: { cookie: `sg_session=${value}` } });
      expect((await exportReport(forged, ctx({}))).status).toBe(401);
    }
  });

  it("BGH duyệt bài chờ rà soát (không tạo checklist), GV sửa phần bị từ chối nếu bài đã chia sẻ", async () => {
    const r = await approve(req(`/api/plans/${ids.reviewPlanId}/approve`, { method: "POST", user: ids.principalId }), ctx({ id: ids.reviewPlanId }));
    const body = await r.json();
    expect(body.plan.status).toBe("approved");
    expect(body.checklistId).toBeNull();

    const edit = await editPlan(
      req(`/api/plans/${ids.sharedPlanId}`, { method: "PATCH", user: ids.teacherId, body: { section: "gameName", value: "Tên mới" } }),
      ctx({ id: ids.sharedPlanId }),
    );
    expect(edit.status).toBe(409);
    expect((await edit.json()).error.code).toBe("ERR-FLOW-01");
  });
});

describe("Chat route stream", () => {
  it("trả về SSE của AI SDK chứa thẻ giáo án; lịch sử được lưu phía server", async () => {
    setChatModel(
      fakeModel()
        .respondWithTools([{ name: "create_lesson_plan", args: { topic: "Gia đình", materials: ["Rổ nhựa"], developmentArea: "social-emotional", duration: 20, space: "indoor" } }])
        .respond(new AIMessage("Xong rồi ạ.")),
    );
    const r = await chat(
      req("/api/chat", {
        method: "POST",
        user: ids.teacherId,
        body: { id: "conv-api-1", message: { id: "m1", role: "user", parts: [{ type: "text", text: "Soạn trò chơi chủ đề Gia đình với rổ nhựa" }] } },
      }),
      ctx({}),
    );
    expect(r.headers.get("content-type")).toMatch(/text\/event-stream/);
    const text = await r.text();
    expect(text).toContain('"type":"data-card"');
    expect(text).toContain('"kind":"plan"');
    expect(text).toContain('"type":"text-delta"');
    const saved = await GET_CONV(req("/api/conversations/conv-api-1", { user: ids.teacherId }), ctx({ id: "conv-api-1" }));
    expect((await saved.json()).messages).toHaveLength(2);
  });

  it("body sai → 400; chat vào hội thoại của người khác → 403; danh sách và xóa hội thoại", async () => {
    const bad = await chat(req("/api/chat", { method: "POST", user: ids.teacherId, body: { id: "x", message: {} } }), ctx({}));
    expect(bad.status).toBe(400);
    const forbid = await GET_CONV(req("/api/conversations/conv-api-1", { user: ids.teacher2Id }), ctx({ id: "conv-api-1" }));
    expect(forbid.status).toBe(403);
    const list = await (await LIST_CONV(req("/api/conversations", { user: ids.teacherId }), ctx({}))).json();
    expect(list.conversations.map((c: { id: string }) => c.id)).toContain("conv-api-1");
    expect((await DEL_CONV(req("/api/conversations/conv-api-1", { method: "DELETE", user: ids.teacherId }), ctx({ id: "conv-api-1" }))).status).toBe(200);
    expect((await GET_CONV(req("/api/conversations/conv-api-1", { user: ids.teacherId }), ctx({ id: "conv-api-1" }))).status).toBe(404);
  });

  it("body rỗng hoặc không phải JSON → 400 (không phải lỗi 500)", async () => {
    const empty = new NextRequest("http://localhost/api/feedback", { method: "POST", headers: { "content-type": "application/json" } });
    const r = await feedback(empty, ctx({}));
    expect(r.status).toBe(400);
    expect((await r.json()).error.code).toBe("ERR-INPUT-01");
  });

  it("API trí nhớ: thêm, liệt kê, quên; người khác không xóa được", async () => {
    const add = await memoryPost(req("/api/memory", { method: "POST", user: ids.teacherId, body: { content: "Lớp thích trò chơi ngoài sân" } }), ctx({}));
    const { memory } = await add.json();
    const list = await (await memoryGet(req("/api/memory", { user: ids.teacherId }), ctx({}))).json();
    expect(list.memories.map((m: { content: string }) => m.content)).toContain("Lớp thích trò chơi ngoài sân");
    expect((await memoryDelete(req(`/api/memory/${memory.id}`, { method: "DELETE", user: ids.teacher2Id }), ctx({ id: memory.id }))).status).toBe(403);
    expect((await memoryDelete(req(`/api/memory/${memory.id}`, { method: "DELETE", user: ids.teacherId }), ctx({ id: memory.id }))).status).toBe(200);
  });
});

describe("Phụ huynh: token, riêng tư và realtime (acceptance #5, #6)", () => {
  const token = () => ids.tokens[ids.huyId];

  it("xem thẻ của đúng bé, phản hồi 1 chạm trả thống kê mới", async () => {
    const v = await parentView(req(`/api/parent/${token()}`), ctx({ token: token() }));
    expect((await v.json()).student.fullName).toBe("Trần Gia Huy");
    const f = await feedback(req("/api/feedback", { method: "POST", body: { token: token(), response: "completed" } }), ctx({}));
    const body = await f.json();
    expect(body.response).toBe("completed");
    expect(body.stats.total).toBe(8);
  });

  it("token sai định dạng → 400 (chặn trước khi chạm DB); token đúng định dạng nhưng không tồn tại → 404 + AuditLog", async () => {
    expect((await parentView(req("/api/parent/sai"), ctx({ token: "sai" }))).status).toBe(400);
    const before = await prisma.auditLog.count({ where: { action: "access_denied", userId: null } });
    expect((await parentView(req("/api/parent/khong-ton-tai-123"), ctx({ token: "khong-ton-tai-123" }))).status).toBe(404);
    expect(await prisma.auditLog.count({ where: { action: "access_denied", userId: null } })).toBe(before + 1);
    expect(JSON.stringify(await prisma.auditLog.findMany({ where: { action: "access_denied" } }))).not.toContain("khong-ton-tai-123");
  });

  it("phụ huynh cố xem/ghi về bé không phải con mình → 403 + AuditLog", async () => {
    const r = await familyMemoryPost(req("/api/family/memory", { method: "POST", user: "demo-parent-1", body: { studentId: ids.otherStudentId, content: "Bé thích vẽ" } }), ctx({}));
    expect(r.status).toBe(403);
    expect((await r.json()).error.message).toMatch(/chỉ có quyền xem thông tin của bé/);
    expect(await prisma.auditLog.count({ where: { action: "access_denied", userId: "demo-parent-1", target: ids.otherStudentId } })).toBeGreaterThanOrEqual(1);
  });

  it("SSE: cô giáo nhận số liệu mới ngay khi phụ huynh phản hồi", async () => {
    const res = await cardStream(req(`/api/cards/${ids.cardId}/stream`, { user: ids.teacherId }), ctx({ id: ids.cardId }));
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    const first = dec.decode((await reader.read()).value);
    expect(first).toContain('"total":8');

    // Gia Huy đổi ý -> needs_practice; stream phải đẩy sự kiện mới
    const pending = reader.read();
    await feedback(req("/api/feedback", { method: "POST", body: { token: token(), response: "needs_practice" } }), ctx({}));
    const second = dec.decode((await pending).value);
    expect(second).toContain('"needsPractice":2');
    await reader.cancel();
  });
});

describe("Cổng phụ huynh /api/family/*", () => {
  const huyParent = "demo-parent-1";
  const otherParent = "demo-parent-2";

  it("RBAC: giáo viên không dùng được trợ lý gia đình; chưa đăng nhập → 401", async () => {
    const body = { studentId: ids.huyId, turns: [{ role: "parent", text: "chào" }] };
    expect((await familyChat(req("/api/family/chat", { method: "POST", body, user: ids.teacherId }), ctx({}))).status).toBe(403);
    expect((await familyChat(req("/api/family/chat", { method: "POST", body }), ctx({}))).status).toBe(401);
  });

  it("chat gia đình: stream SSE có thẻ hoạt động cá nhân hóa; hỏi về con người khác → 403", async () => {
    setChatModel(fakeModel().respondWithTools([{ name: "suggest_home_activity", args: {} }]).respond(new AIMessage("Bố mẹ thử nhé")));
    const ok = await familyChat(req("/api/family/chat", { method: "POST", user: huyParent, body: { studentId: ids.huyId, turns: [{ role: "parent", text: "Tối nay chơi gì?" }] } }), ctx({}));
    const text = await ok.text();
    expect(text).toContain('"kind":"home-activity"');
    const denied = await familyChat(req("/api/family/chat", { method: "POST", user: otherParent, body: { studentId: ids.huyId, turns: [{ role: "parent", text: "hi" }] } }), ctx({}));
    expect(denied.status).toBe(403);
  });

  it("sendBeacon: bộ nhớ ngắn hạn từ trình duyệt được ghi DB, idempotent; không ghi hộ con người khác", async () => {
    const payload = {
      sessionId: "sess-api-0001",
      studentId: ids.huyId,
      events: [{ seq: 1, type: "view", at: new Date().toISOString() }],
      transcript: [{ role: "parent", text: "Bé mê khủng long" }, { role: "assistant", text: "Hay quá" }],
    };
    const beacon = (user: string, body: unknown) =>
      new NextRequest("http://localhost/api/family/sessions", { method: "POST", headers: { "content-type": "application/json", ...as(user) }, body: JSON.stringify(body) });
    expect((await familySessions(beacon(huyParent, payload), ctx({}))).status).toBe(200);
    expect((await familySessions(beacon(huyParent, payload), ctx({}))).status).toBe(200);
    expect(await prisma.learningSession.count({ where: { id: "sess-api-0001" } })).toBe(1);
    expect((await familySessions(beacon(otherParent, { ...payload, sessionId: "sess-api-0002" }), ctx({}))).status).toBe(403);
    expect((await familySessions(beacon(huyParent, { ...payload, events: "xấu" }), ctx({}))).status).toBe(400);
  });

  it("gợi ý tối nay một chạm, ghi nhớ và quên về bé (chỉ phụ huynh của bé)", async () => {
    const act = await familyActivity(req("/api/family/activity", { method: "POST", user: huyParent, body: { studentId: ids.huyId, focus: "có hộp giấy" } }), ctx({}));
    expect((await act.json()).activity.steps.length).toBeGreaterThanOrEqual(3);
    const add = await familyMemoryPost(req("/api/family/memory", { method: "POST", user: huyParent, body: { studentId: ids.huyId, content: "Bé thích chơi trò đóng vai bác sĩ" } }), ctx({}));
    const { memory } = await add.json();
    expect((await familyMemoryDel(req(`/api/family/memory/${memory.id}`, { method: "DELETE", user: otherParent }), ctx({ id: memory.id }))).status).toBe(403);
    expect((await familyMemoryDel(req(`/api/family/memory/${memory.id}`, { method: "DELETE", user: huyParent }), ctx({ id: memory.id }))).status).toBe(200);
  });

  it("công tắc chia sẻ hồ sơ với cô: chỉ phụ huynh của bé, bật/tắt có hiệu lực ngay", async () => {
    const toggle = (user: string, studentId: string, shared: boolean) => familySharing(req("/api/family/sharing", { method: "POST", user, body: { studentId, shared } }), ctx({}));
    expect((await toggle(otherParent, ids.huyId, false)).status).toBe(403);
    expect((await toggle(ids.teacherId, ids.huyId, false)).status).toBe(403);
    expect((await toggle(huyParent, ids.huyId, false)).status).toBe(200);
    expect((await prisma.student.findUnique({ where: { id: ids.huyId } }))!.profileSharedWithTeacher).toBe(false);
    expect((await toggle(huyParent, ids.huyId, true)).status).toBe(200);
    expect((await prisma.student.findUnique({ where: { id: ids.huyId } }))!.profileSharedWithTeacher).toBe(true);
  });
});
