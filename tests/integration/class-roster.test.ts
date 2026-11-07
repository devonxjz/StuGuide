import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createRepositories } from "@/data/repositories";
import { createServices } from "@/services";
import { createFakeEngine } from "../helpers/fake-engine";
import { PermissionError } from "@/core/guardrails";
import { createClassBodySchema } from "@/core/schemas/class.schema";

type Db = Awaited<ReturnType<typeof createTestDb>>;
let db: Db;
const services = () => createServices({ repos: createRepositories(db.prisma), engine: createFakeEngine(), events: { publishFeedback: () => {} }, mailer: null });
const teacher = () => ({ id: db.ids.teacherId, role: "teacher" as const, classId: db.ids.classId, schoolId: db.ids.schoolId });

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => db.prisma.$disconnect());

const body = (rows: unknown[]) => createClassBodySchema.parse({ name: "Lớp Mầm 9", ageGroup: "3-4y", rows });
const row = (o: object) => ({ studentName: "An", dateOfBirth: "2022-01-02", gender: "Nam", parentName: "Chị Mai", ...o });

describe("thêm lớp kèm học sinh + phụ huynh", () => {
  it("tạo lớp, gán cô chủ nhiệm, gộp anh chị em cùng số điện thoại, bỏ qua dòng trùng", async () => {
    const s = services();
    const result = await s.classes.create(
      teacher(),
      body([
        row({ studentName: "An", parentPhone: "0977000001" }),
        row({ studentName: "Bình", parentPhone: "0977000001", dateOfBirth: "2021-05-05" }),
        row({ studentName: "An", parentPhone: "0977000002" }),
        row({ studentName: "Chi", parentName: "Anh Hải", parentEmail: "hai@example.com" }),
      ]),
    );
    expect(result).toMatchObject({ className: "Lớp Mầm 9", students: 3, parents: 2 });
    expect(result.problems).toHaveLength(1);

    const mine = await db.prisma.classTeacher.findFirst({ where: { classId: result.classId, teacherId: db.ids.teacherId } });
    expect(mine?.isPrimary).toBe(true);
    const roster = await s.classes.roster({ ...teacher(), classId: result.classId });
    expect(roster.map((r) => r.studentName)).toEqual(["An", "Bình", "Chi"]);
    expect(roster[0].parents[0].phone).toBe("0977000001");
    expect(roster[0].parents[0].name).toBe(roster[1].parents[0].name);
  });

  it("tra cứu theo tên phụ huynh, số điện thoại, email", async () => {
    const s = services();
    const actor = teacher();
    const made = await s.classes.create(actor, body([row({ studentName: "Khôi", parentName: "Chị Lan", parentPhone: "0911222333", parentEmail: "lan@example.com" })]));
    const at = { ...actor, classId: made.classId };
    expect(await s.classes.roster(at, "lan")).toHaveLength(1);
    expect(await s.classes.roster(at, "0911 222")).toHaveLength(1);
    expect(await s.classes.roster(at, "lan@example.com")).toHaveLength(1);
    expect(await s.classes.roster(at, "không có")).toHaveLength(0);
  });

  it("số điện thoại đã thuộc tài khoản không phải phụ huynh cùng trường thì bỏ qua dòng đó", async () => {
    const s = services();
    await db.prisma.user.update({ where: { id: db.ids.teacherId }, data: { phone: "0988000111" } });
    const result = await s.classes.create(teacher(), body([row({ studentName: "Lạ", parentPhone: "0988000111" })]));
    expect(result.students).toBe(0);
    expect(result.problems[0]).toContain("tài khoản khác");
  });

  it("tạo lớp rỗng được, và phụ huynh không có quyền", async () => {
    const s = services();
    expect((await s.classes.create(teacher(), body([]))).students).toBe(0);
    await expect(s.classes.create({ id: db.ids.parentIds[0], role: "parent", schoolId: db.ids.schoolId }, body([]))).rejects.toBeInstanceOf(PermissionError);
  });
});
