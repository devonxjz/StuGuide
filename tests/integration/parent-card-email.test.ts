import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createRepositories } from "@/data/repositories";
import { createServices, type Mailer, type Services } from "@/services";
import { createFakeEngine } from "../helpers/fake-engine";
import type { CreatePlanInput } from "@/core/schemas/form-inputs.schema";

type Db = Awaited<ReturnType<typeof createTestDb>>;
type Mail = { to: string; subject: string; text: string; html?: string; replyTo?: string };
let db: Db;
let svc: Services;
let failFor: string | null = null;
const mails: Mail[] = [];

const mailer: Mailer = {
  async send(message) {
    if (failFor && message.to === failFor) throw new Error("smtp down: secret-host");
    mails.push(message);
  },
};

const input: CreatePlanInput = {
  ageGroup: "4-5y",
  developmentArea: "social-emotional",
  topic: "Bản thân & Tình bạn",
  materials: ["Vỏ hộp sữa tái chế", "Rổ nhựa", "Bóng nhựa nhỏ"],
  duration: 20,
  space: "indoor",
  stemEnabled: false,
  folkGameEnabled: false,
};

const teacher = () => ({ id: db.ids.teacherId, role: "teacher" as const, classId: db.ids.classId, schoolId: db.ids.schoolId });

beforeAll(async () => {
  db = await createTestDb();
  svc = createServices({ repos: createRepositories(db.prisma), engine: createFakeEngine(), events: { publishFeedback: () => {} }, mailer });
});
afterAll(async () => db.prisma.$disconnect());
beforeEach(() => {
  mails.length = 0;
  failFor = null;
});

/** Soạn & duyệt một bài mới, cô ghi nhận xét cho bé đầu tiên rồi tạo thẻ. */
async function approvedCardWithNote(note: string) {
  const { plan } = await svc.lessonPlanner.create(input, teacher());
  await svc.lessonPlanner.approve(plan.id, teacher());
  const { checklist, criteria } = await svc.assessment.createChecklist(plan.id, teacher());
  const entries = db.ids.studentIds.map((studentId, i) => ({
    studentId,
    overallRating: "achieved" as const,
    ratings: Object.fromEntries(criteria.map((_, c) => [String(c), "achieved"])) as Record<string, "achieved">,
    ...(i === 0 ? { note } : {}),
  }));
  await svc.assessment.save({ checklistId: checklist.id, entries }, teacher());
  return svc.parentCards.generate(plan.id, teacher());
}

describe("Gửi thẻ nhiệm vụ qua Gmail", () => {
  it("gửi thư HTML tới phụ huynh có email, kèm nhận xét riêng của cô về đúng bé đó", async () => {
    const huyParent = db.ids.parentIds[0];
    await db.prisma.user.update({ where: { id: huyParent }, data: { email: "phuhuynh.huy@example.com" } });
    const card = await approvedCardWithNote("Bé tự tin rủ bạn chơi cùng.");

    const res = await svc.parentCards.send(card.id, teacher(), { baseUrl: "https://stuguide.test" });

    expect(res.emails).toMatchObject({ enabled: true, sent: 1, failed: 0 });
    expect(res.emails.noEmail).toBe(res.links.length - 1);
    expect(mails).toHaveLength(1);
    const [mail] = mails;
    expect(mail.to).toBe("phuhuynh.huy@example.com");
    expect(mail.html).toContain("<html");
    expect(mail.html).toContain("Bé tự tin rủ bạn chơi cùng.");
    expect(mail.text).toContain("Bé tự tin rủ bạn chơi cùng.");
    expect(mail.html).toMatch(/https:\/\/stuguide\.test\/parent\/[\w-]+/);
  });

  it("không có nhận xét thì thư không có khối nhận xét", async () => {
    await db.prisma.user.update({ where: { id: db.ids.parentIds[1] }, data: { email: "phuhuynh.khac@example.com" } });
    const card = await approvedCardWithNote("Nhận xét chỉ dành cho bé đầu tiên.");
    await svc.parentCards.send(card.id, teacher());
    const other = mails.find((m) => m.to === "phuhuynh.khac@example.com");
    expect(other).toBeDefined();
    expect(other!.html).not.toContain("Nhận xét của cô về bé");
    expect(other!.text).not.toContain("Nhận xét chỉ dành cho bé đầu tiên.");
  });

  it("lỗi SMTP không làm hỏng việc phát hành thẻ và không lộ chi tiết kỹ thuật", async () => {
    await db.prisma.user.update({ where: { id: db.ids.parentIds[0] }, data: { email: "hong@example.com" } });
    failFor = "hong@example.com";
    const card = await approvedCardWithNote("Bé hợp tác tốt.");
    const res = await svc.parentCards.send(card.id, teacher());
    expect(res.card.status).toBe("sent");
    expect(res.emails.failed).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(res.emails)).not.toContain("secret-host");
  });

  it("chưa cấu hình SMTP thì vẫn phát hành thẻ và báo enabled=false", async () => {
    const noMail = createServices({ repos: createRepositories(db.prisma), engine: createFakeEngine(), events: { publishFeedback: () => {} }, mailer: null });
    const card = await approvedCardWithNote("Bé vui vẻ.");
    const res = await noMail.parentCards.send(card.id, teacher());
    expect(res.card.status).toBe("sent");
    expect(res.emails.enabled).toBe(false);
  });
});
