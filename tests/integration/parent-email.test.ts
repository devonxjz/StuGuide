import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createRepositories } from "@/data/repositories";
import { createServices, type Mailer, type Services } from "@/services";
import { createFakeEngine } from "../helpers/fake-engine";
import { FlowError } from "@/core/errors";
import { PermissionError } from "@/core/guardrails";

type Db = Awaited<ReturnType<typeof createTestDb>>;
let db: Db;
const sent: { to: string; subject: string; text: string; replyTo?: string }[] = [];
let failFor: string | null = null;

const mailer: Mailer = {
  async send(message) {
    if (failFor && message.to === failFor) throw new Error("smtp down: secret-host");
    sent.push(message);
  },
};

const build = (opts: { mailer?: Mailer | null; engine?: ReturnType<typeof createFakeEngine> } = {}): Services =>
  createServices({
    repos: createRepositories(db.prisma),
    engine: opts.engine ?? createFakeEngine(),
    events: { publishFeedback: () => {} },
    mailer: opts.mailer === undefined ? mailer : opts.mailer,
  });

const teacher = () => ({ id: db.ids.teacherId, role: "teacher" as const, classId: db.ids.classId, schoolId: db.ids.schoolId });
const parent = () => ({ id: db.ids.parentIds[0], role: "parent" as const });

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => db.prisma.$disconnect());
beforeEach(() => {
  sent.length = 0;
  failFor = null;
});

describe("Danh bạ phụ huynh", () => {
  it("cô nhập email theo tên bé: ghi vào đúng phụ huynh đã liên kết, báo dòng không khớp", async () => {
    const svc = build();
    const res = await svc.parentEmails.importContacts(teacher(), [
      { studentName: "Trần Gia Huy", email: "me.giahuy@example.com" },
      { studentName: "bé Minh Anh", email: "bo.minhanh@example.com" },
      { studentName: "Không Có Bé Này", email: "x@example.com" },
    ]);
    expect(res.updated.map((u) => u.studentName)).toEqual(["Trần Gia Huy", "Nguyễn Minh Anh"]);
    expect(res.problems).toHaveLength(1);

    const rows = await svc.parentEmails.contacts(teacher());
    expect(rows.find((r) => r.studentName === "Trần Gia Huy")?.parents[0].email).toBe("me.giahuy@example.com");
  });

  it("không gán email đã thuộc tài khoản khác (không ghi đè/chiếm địa chỉ)", async () => {
    const svc = build();
    const res = await svc.parentEmails.importContacts(teacher(), [{ studentName: "Lê Bảo Châu", email: "me.giahuy@example.com" }]);
    expect(res.updated).toHaveLength(0);
    expect(res.problems[0]).toMatch(/đã thuộc tài khoản khác/);
  });

  it("chỉ giáo viên có quyền; phụ huynh bị từ chối", async () => {
    await expect(build().parentEmails.contacts(parent())).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("Soạn thư (draft)", () => {
  it("mỗi bé một thư riêng, bé có ghi chú mang loại good/concern, bé còn lại là cập nhật chung", async () => {
    const svc = build();
    const res = await svc.parentEmails.draft(teacher(), {
      scope: "all",
      notes: [
        { student: "Gia Huy", kind: "concern", note: "Hơi ngập ngừng khi vào nhóm" },
        { student: "Minh Anh", kind: "good", note: "Ném bóng chính xác" },
      ],
    });
    expect(res.drafts).toHaveLength(8);
    const huy = res.drafts.find((d) => d.studentName === "Trần Gia Huy")!;
    expect(huy.kind).toBe("concern");
    expect(huy.body).toContain("ngập ngừng");
    expect(res.drafts.find((d) => d.studentName === "Nguyễn Minh Anh")!.kind).toBe("good");
    expect(res.drafts.filter((d) => d.kind === "none")).toHaveLength(6);
    expect(res.mailerReady).toBe(true);
    expect(sent).toHaveLength(0); // soạn thì không gửi gì
  });

  it("scope 'noted' chỉ soạn cho bé có ghi chú", async () => {
    const res = await build().parentEmails.draft(teacher(), { scope: "noted", notes: [{ student: "Gia Bảo", kind: "good", note: "Giúp bạn xếp đồ" }] });
    expect(res.drafts.map((d) => d.studentName)).toEqual(["Phạm Gia Bảo"]);
  });

  it("tên bé mơ hồ hoặc không có trong lớp thì hỏi lại, không đoán", async () => {
    const svc = build();
    await expect(svc.parentEmails.draft(teacher(), { scope: "noted", notes: [{ student: "Gia", kind: "good", note: "x" }] })).rejects.toThrow(/khớp nhiều bé/);
    await expect(svc.parentEmails.draft(teacher(), { scope: "noted", notes: [{ student: "Tí Tèo", kind: "good", note: "x" }] })).rejects.toThrow(/không thấy bé/);
    await expect(svc.parentEmails.draft(teacher(), { scope: "noted", notes: [] })).rejects.toBeInstanceOf(FlowError);
  });

  it("thư lỡ nhắc tên bé khác thì được soạn lại một lần; vẫn lỗi thì chặn", async () => {
    let calls = 0;
    const engine = createFakeEngine({
      async generateParentEmails({ students }) {
        calls++;
        return students.map((s) => ({ studentId: s.id, subject: `Thư bé ${s.name}`, body: calls === 1 ? `Bé ${s.name} chơi cùng bạn Nguyễn Minh Anh.` : `Bé ${s.name} chơi vui.` }));
      },
    });
    const res = await build({ engine }).parentEmails.draft(teacher(), { scope: "noted", notes: [{ student: "Gia Huy", kind: "good", note: "vui" }] });
    expect(res.drafts[0].body).not.toContain("Minh Anh");
    expect(calls).toBe(2);

    const stubborn = createFakeEngine({
      async generateParentEmails({ students }) {
        return students.map((s) => ({ studentId: s.id, subject: "Thư", body: `Bé ${s.name} chơi cùng bạn Nguyễn Minh Anh.` }));
      },
    });
    await expect(build({ engine: stubborn }).parentEmails.draft(teacher(), { scope: "noted", notes: [{ student: "Gia Huy", kind: "good", note: "vui" }] })).rejects.toThrow(/chưa đạt/);
  });

  it("từ ngữ chẩn đoán trong thư do AI soạn bị thay bằng cụm trung lập", async () => {
    const engine = createFakeEngine({
      async generateParentEmails({ students }) {
        return students.map((s) => ({ studentId: s.id, subject: "Thư", body: `Bé ${s.name} có dấu hiệu tăng động.` }));
      },
    });
    const res = await build({ engine }).parentEmails.draft(teacher(), { scope: "noted", notes: [{ student: "Gia Huy", kind: "concern", note: "hay chạy" }] });
    expect(res.drafts[0].body).not.toContain("tăng động");
  });

  it("chưa cấu hình mailer thì vẫn soạn được và báo mailerReady=false", async () => {
    const res = await build({ mailer: null }).parentEmails.draft(teacher(), { scope: "noted", notes: [{ student: "Gia Huy", kind: "good", note: "vui" }] });
    expect(res.mailerReady).toBe(false);
  });
});

describe("Gửi thư (send)", () => {
  const huy = async () => (await build().parentEmails.contacts(teacher())).find((r) => r.studentName === "Trần Gia Huy")!;

  it("gửi tới email trong danh bạ, đặt Reply-To là cô, ghi audit, kèm chân thư", async () => {
    const svc = build();
    await svc.parentEmails.importContacts(teacher(), [{ studentName: "Trần Gia Huy", email: "huy.parent@example.com" }]);
    const { results } = await svc.parentEmails.send(teacher(), { emails: [{ studentId: (await huy()).studentId, subject: "Tiêu đề\nchèn dòng", body: "Kính gửi phụ huynh bé Trần Gia Huy,\nBé hôm nay rất vui." }] });

    expect(results[0]).toMatchObject({ studentName: "Trần Gia Huy", status: "sent", sentTo: ["huy.parent@example.com"] });
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Tiêu đề chèn dòng"); // không cho xuống dòng trong tiêu đề (header injection)
    expect(sent[0].replyTo).toBe("lan@hoamai.edu.vn");
    expect(sent[0].text).toContain("Thư được gửi qua StuGuide");
    expect(await db.prisma.auditLog.count({ where: { action: "send_parent_email" } })).toBeGreaterThan(0);
  });

  it("bấm gửi lại cùng nội dung trong 24 giờ thì không gửi trùng", async () => {
    const svc = build();
    await svc.parentEmails.importContacts(teacher(), [{ studentName: "Nguyễn Minh Anh", email: "ma.parent@example.com" }]);
    const studentId = (await svc.parentEmails.contacts(teacher())).find((r) => r.studentName === "Nguyễn Minh Anh")!.studentId;
    const body = { emails: [{ studentId, subject: "Thông tin buổi học", body: "Bé Nguyễn Minh Anh làm tốt." }] };

    expect((await svc.parentEmails.send(teacher(), body)).results[0].status).toBe("sent");
    expect((await svc.parentEmails.send(teacher(), body)).results[0].status).toBe("duplicate");
    expect(sent).toHaveLength(1);
    // sửa nội dung thì được gửi lại
    expect((await svc.parentEmails.send(teacher(), { emails: [{ ...body.emails[0], body: "Bé Nguyễn Minh Anh làm rất tốt." }] })).results[0].status).toBe("sent");
  });

  it("bé chưa có email → no_email; không gửi gì", async () => {
    const svc = build();
    const studentId = (await svc.parentEmails.contacts(teacher())).find((r) => r.studentName === "Vũ Đức Khang")!.studentId;
    const { results } = await svc.parentEmails.send(teacher(), { emails: [{ studentId, subject: "Tiêu đề", body: "Nội dung" }] });
    expect(results[0].status).toBe("no_email");
    expect(sent).toHaveLength(0);
  });

  it("lỗi SMTP không lộ chi tiết kỹ thuật và không làm hỏng các thư khác", async () => {
    const svc = build();
    await svc.parentEmails.importContacts(teacher(), [
      { studentName: "Phạm Gia Bảo", email: "bao.fail@example.com" },
      { studentName: "Lê Bảo Châu", email: "chau.ok@example.com" },
    ]);
    const rows = await svc.parentEmails.contacts(teacher());
    failFor = "bao.fail@example.com";
    const { results } = await svc.parentEmails.send(teacher(), {
      emails: ["Phạm Gia Bảo", "Lê Bảo Châu"].map((n) => ({ studentId: rows.find((r) => r.studentName === n)!.studentId, subject: "Tiêu đề", body: `Nội dung riêng cho ${n}` })),
    });
    expect(results.map((r) => r.status)).toEqual(["failed", "sent"]);
    expect(results[0].error).not.toMatch(/smtp|secret-host/i);
    expect(sent.map((m) => m.to)).toEqual(["chau.ok@example.com"]);
  });

  it("chặn thư còn từ chẩn đoán hoặc nhắc tên bé khác (cô có thể đã sửa tay)", async () => {
    const svc = build();
    const studentId = (await huy()).studentId;
    const { results } = await svc.parentEmails.send(teacher(), {
      emails: [
        { studentId, subject: "Tiêu đề", body: "Bé có dấu hiệu tự kỷ." },
        { studentId, subject: "Tiêu đề", body: "Bé chơi cùng Nguyễn Minh Anh." },
      ],
    });
    expect(results.map((r) => r.status)).toEqual(["failed", "failed"]);
    expect(sent).toHaveLength(0);
  });

  it("không gửi cho bé ngoài lớp mình phụ trách và không tin địa chỉ do client gửi", async () => {
    const svc = build();
    const other = await db.prisma.student.create({ data: { fullName: "Bé Lớp Khác", dateOfBirth: new Date("2021-01-01"), gender: "Nam", classId: db.ids.class2Id } });
    const otherClassStudent = { studentId: other.id };
    await expect(svc.parentEmails.send(teacher(), { emails: [{ studentId: otherClassStudent.studentId, subject: "Tiêu đề", body: "Nội dung" }] })).rejects.toBeInstanceOf(PermissionError);
    expect(sent).toHaveLength(0);
  });

  it("chưa cấu hình SMTP thì báo rõ và không gửi", async () => {
    const svc = build({ mailer: null });
    const studentId = (await huy()).studentId;
    await expect(svc.parentEmails.send(teacher(), { emails: [{ studentId, subject: "Tiêu đề", body: "Nội dung" }] })).rejects.toThrow(/SMTP/);
  });
});
