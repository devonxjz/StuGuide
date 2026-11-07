import { assertCan } from "@/core/guardrails";
import { FlowError } from "@/core/errors";
import { getAgeLabel } from "@/core/constants/age-groups";
import type { CreateClassBody, CreateClassResult } from "@/core/schemas/class.schema";
import type { NewParent, NewStudent } from "@/data/repositories/class.repo";
import type { Actor, ServiceDeps } from "./types";
import type { AuditService } from "./audit.service";

const fold = (s: string) => s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
const age = (dob: Date, now = new Date()) => {
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + now.getMonth() - dob.getMonth() - (now.getDate() < dob.getDate() ? 1 : 0);
  return months >= 24 ? `${Math.floor(months / 12)} tuổi` : `${months} tháng`;
};
const dateVi = (d: Date) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(d);

export interface RosterEntry {
  studentName: string;
  dateOfBirth: string;
  age: string;
  gender: string | null;
  parents: { name: string; phone: string | null; email: string | null }[];
}

export function createClassService({ repos }: ServiceDeps, audit: AuditService) {
  return {
    /**
     * Cô thêm lớp mới cùng danh sách bé + phụ huynh. Phụ huynh có cùng số điện thoại/email chỉ tạo một tài khoản (anh chị em cùng trường).
     * Dòng trùng bé hoặc dùng liên lạc của tài khoản không phải phụ huynh cùng trường bị bỏ qua và báo lại, không làm hỏng cả file.
     */
    async create(actor: Actor, input: CreateClassBody): Promise<CreateClassResult> {
      assertCan(actor.role, "class:write");
      if (!actor.schoolId) throw new FlowError("Tài khoản chưa thuộc trường nào nên chưa thể thêm lớp");
      const schoolId = actor.schoolId;
      const problems: string[] = [];

      const existing = await repos.users.findByContacts(
        input.rows.flatMap((r) => (r.parentPhone ? [r.parentPhone] : [])),
        input.rows.flatMap((r) => (r.parentEmail ? [r.parentEmail] : [])),
      );
      const byPhone = new Map(existing.filter((u) => u.phone).map((u) => [u.phone!, u]));
      const byEmail = new Map(existing.filter((u) => u.email).map((u) => [u.email!, u]));

      const parents = new Map<string, NewParent>();
      const phoneKey = new Map<string, string>();
      const emailKey = new Map<string, string>();
      const students: NewStudent[] = [];
      const seenStudents = new Set<string>();

      for (const row of input.rows) {
        const label = `Bé ${row.studentName}`;
        const studentKey = `${fold(row.studentName)}|${row.dateOfBirth}`;
        if (seenStudents.has(studentKey)) {
          problems.push(`${label}: trùng họ tên và ngày sinh với dòng trước, đã bỏ qua`);
          continue;
        }

        const owners = [row.parentPhone && byPhone.get(row.parentPhone), row.parentEmail && byEmail.get(row.parentEmail)].filter((u) => !!u);
        const foreign = owners.find((u) => u.role !== "parent" || u.schoolId !== schoolId);
        if (foreign || new Set(owners.map((u) => u.id)).size > 1) {
          problems.push(`${label}: số điện thoại/email phụ huynh đang thuộc tài khoản khác, đã bỏ qua`);
          continue;
        }

        let parent: NewStudent["parent"];
        if (owners[0]) parent = { existingId: owners[0].id };
        else {
          // Cùng số điện thoại hoặc email trong file = cùng một phụ huynh; chỉ trùng tên thì KHÔNG gộp (có thể là hai người)
          const sameFile = (row.parentPhone && phoneKey.get(row.parentPhone)) || (row.parentEmail && emailKey.get(row.parentEmail)) || undefined;
          const key = sameFile || `p${parents.size}`;
          const known = parents.get(key);
          if (known && (row.parentPhone && known.phone && known.phone !== row.parentPhone || row.parentEmail && known.email && known.email !== row.parentEmail)) {
            problems.push(`${label}: số điện thoại và email thuộc hai phụ huynh khác nhau trong file, đã bỏ qua`);
            continue;
          }
          if (!known) parents.set(key, { key, fullName: row.parentName, phone: row.parentPhone, email: row.parentEmail });
          else {
            known.phone ??= row.parentPhone;
            known.email ??= row.parentEmail;
          }
          const merged = parents.get(key)!;
          if (merged.phone) phoneKey.set(merged.phone, key);
          if (merged.email) emailKey.set(merged.email, key);
          parent = { key };
        }
        seenStudents.add(studentKey);
        students.push({ fullName: row.studentName, dateOfBirth: new Date(`${row.dateOfBirth}T00:00:00Z`), gender: row.gender, parent });
      }

      const cls = await repos.classes.createWithRoster({
        schoolId,
        teacherId: actor.id,
        name: input.name,
        ageGroup: input.ageGroup,
        ageLabel: getAgeLabel(input.ageGroup),
        parents: [...parents.values()],
        students,
      });
      await audit.log({ userId: actor.id, action: "create_class", target: cls.id, details: `${students.length} bé, ${parents.size} phụ huynh mới, ${problems.length} dòng bỏ qua` });
      return { classId: cls.id, className: cls.name, students: students.length, parents: parents.size, problems };
    },

    /** Hồ sơ lớp mình phụ trách (bé + phụ huynh), lọc theo từ khóa tên bé/tên phụ huynh/số điện thoại/email nếu có. */
    async roster(actor: Actor, query?: string): Promise<RosterEntry[]> {
      assertCan(actor.role, "class:write");
      if (!actor.classId) throw new FlowError("Tài khoản này chưa được gán lớp");
      const q = query ? fold(query) : "";
      const digits = q.replace(/\D/g, "");
      const entries = (await repos.classes.roster(actor.classId)).map((s) => ({
        studentName: s.fullName,
        dateOfBirth: dateVi(s.dateOfBirth),
        age: age(s.dateOfBirth),
        gender: s.gender,
        parents: s.parents.map((l) => ({ name: l.parent.fullName, phone: l.parent.phone, email: l.parent.email })),
      }));
      if (!q) return entries;
      return entries.filter(
        (e) =>
          fold(e.studentName).includes(q) ||
          e.parents.some((p) => fold(p.name).includes(q) || p.email?.includes(q) || (digits.length >= 4 && p.phone?.replace(/\D/g, "").includes(digits))),
      );
    },
  };
}
export type ClassService = ReturnType<typeof createClassService>;
