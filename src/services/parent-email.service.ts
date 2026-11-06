import { createHash } from "node:crypto";
import { assertCan, checkLanguage, PermissionError } from "@/core/guardrails";
import { sanitizeDeep } from "@/core/guardrails/language-guard";
import { FlowError } from "@/core/errors";
import { findOtherStudentNames, matchStudentName } from "@/core/student-matching";
import type {
  ContactRow,
  EmailNote,
  EmailSendResult,
  ParentEmailDraft,
  SendEmailsBody,
} from "@/core/schemas/parent-email.schema";
import type { EmailStudentInput } from "@/ai/prompts/parent-email-writer.prompt";
import type { Actor, ServiceDeps } from "./types";
import type { AuditService } from "./audit.service";
import type { LessonPlannerService } from "./lesson-planner.service";

const NO_MAILER =
  "Chưa cấu hình gửi email. Cần thêm SMTP_HOST, SMTP_USER, SMTP_PASS (và SMTP_FROM nếu muốn) vào .env.local rồi khởi động lại máy chủ.";
const NO_CLASS = "Tài khoản này chưa được gán lớp nên chưa có danh bạ phụ huynh";
/** Soạn thư theo lô nhỏ để không vượt giới hạn đầu ra của mô hình khi lớp đông. */
const BATCH_SIZE = 8;
/** Cùng một nội dung gửi lại cho cùng một phụ huynh trong khoảng này bị coi là bấm trùng. */
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const SEND_ACTION = "send_parent_email";

const dateLabel = (d: Date) =>
  new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(d);
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const fingerprint = (subject: string, body: string) => createHash("sha256").update(`${subject}\n${body}`).digest("hex").slice(0, 16);

export interface DraftInput {
  planId?: string;
  /** "noted": chỉ bé có ghi chú; "all": cả lớp (bé không có ghi chú nhận bản cập nhật chung) */
  scope: "noted" | "all";
  notes: EmailNote[];
  overallNote?: string;
}

export function createParentEmailService({ repos, engine, mailer }: ServiceDeps, audit: AuditService, planner: LessonPlannerService) {
  const classOf = (actor: Actor) => {
    assertCan(actor.role, "email:write");
    if (!actor.classId) throw new FlowError(NO_CLASS);
    return actor.classId;
  };

  type StudentWithParents = Awaited<ReturnType<typeof repos.students.listWithParents>>[number];
  const recipientsOf = (s: StudentWithParents) =>
    s.parents.map((l) => ({ parentId: l.parent.id, parentName: l.parent.fullName, email: l.parent.email ?? null }));

  /** Gộp các ghi chú của cùng một bé; có "concern" thì cả bé được xếp loại cần quan tâm. */
  const mergeNotes = (notes: EmailNote[], students: StudentWithParents[]) => {
    const merged = new Map<string, { kind: "good" | "concern"; notes: string[] }>();
    const problems: string[] = [];
    for (const n of notes) {
      const match = matchStudentName(n.student, students);
      if (match.kind === "missing") problems.push(`không thấy bé "${n.student}" trong lớp`);
      else if (match.kind === "ambiguous") problems.push(`"${n.student}" khớp nhiều bé (${match.candidates.map((c) => c.fullName).join(", ")})`);
      else {
        const cur = merged.get(match.student.id) ?? { kind: n.kind, notes: [] };
        cur.notes.push(n.note);
        if (n.kind === "concern") cur.kind = "concern";
        merged.set(match.student.id, cur);
      }
    }
    if (problems.length) throw new FlowError(`Mình chưa ghép được tên bé: ${problems.join("; ")}. Cô gõ lại tên đầy đủ giúp mình nhé.`);
    return merged;
  };

  /** Thư của bé nào lỡ nhắc tên bé khác thì trả danh sách để soạn lại. */
  const leaks = (draft: { studentId: string; subject: string; body: string }, students: StudentWithParents[]) => {
    const own = students.find((s) => s.id === draft.studentId);
    return own ? findOtherStudentNames(`${draft.subject}\n${draft.body}`, own, students) : [];
  };

  return {
    /** Danh bạ phụ huynh của lớp mình phụ trách. */
    async contacts(actor: Actor): Promise<ContactRow[]> {
      const students = await repos.students.listWithParents(classOf(actor));
      return students.map((s) => ({ studentId: s.id, studentName: s.fullName, parents: recipientsOf(s) }));
    },

    /** Cô nhập email phụ huynh theo tên bé: ghi vào tài khoản phụ huynh đã liên kết với bé, không tạo tài khoản mới. */
    async importContacts(actor: Actor, rows: { studentName: string; email: string }[]) {
      const classId = classOf(actor);
      const students = await repos.students.listWithParents(classId);
      const result = { updated: [] as { studentName: string; parentName: string; email: string }[], problems: [] as string[] };
      for (const row of rows) {
        const match = matchStudentName(row.studentName, students);
        if (match.kind !== "found") {
          result.problems.push(match.kind === "ambiguous" ? `"${row.studentName}" khớp nhiều bé` : `Không thấy bé "${row.studentName}" trong lớp`);
          continue;
        }
        const links = match.student.parents;
        if (!links.length) {
          result.problems.push(`Bé ${match.student.fullName} chưa liên kết phụ huynh nào`);
          continue;
        }
        // Ưu tiên phụ huynh chưa có email để không ghi đè địa chỉ đang dùng
        const target = (links.find((l) => !l.parent.email) ?? links[0]).parent;
        const owner = await repos.users.findByEmail(row.email);
        if (owner && owner.id !== target.id) {
          result.problems.push(`Email ${row.email} đã thuộc tài khoản khác nên không gán cho bé ${match.student.fullName}`);
          continue;
        }
        await repos.users.setEmail(target.id, row.email);
        target.email = row.email;
        result.updated.push({ studentName: match.student.fullName, parentName: target.fullName, email: row.email });
      }
      await audit.log({ userId: actor.id, action: "import_contacts", target: classId, details: `${result.updated.length}/${rows.length} dòng` });
      return result;
    },

    /** AI soạn thư theo ghi chú của cô. Chưa gửi gì: chỉ trả bản nháp để cô duyệt. */
    async draft(actor: Actor, input: DraftInput) {
      const classId = classOf(actor);
      const students = await repos.students.listWithParents(classId);
      if (!students.length) throw new FlowError("Lớp chưa có bé nào để soạn thư");

      const notes = mergeNotes(input.notes, students);
      const targets = input.scope === "noted" ? students.filter((s) => notes.has(s.id)) : students;
      if (!targets.length) throw new FlowError("Cô chưa nêu bé nào để soạn thư. Cô nói tên bé kèm điều cô quan sát, hoặc bảo mình soạn cho cả lớp nhé.");

      const plan = input.planId ? await planner.getForActor(input.planId, actor) : ((await repos.lessonPlans.listByClass(classId, 1))[0] ?? null);
      const [teacher, cls] = await Promise.all([repos.users.findById(actor.id), repos.users.findClass(classId)]);

      const inputs: EmailStudentInput[] = targets.map((s) => {
        const n = notes.get(s.id);
        return { id: s.id, name: s.fullName, kind: n?.kind ?? "none", note: n?.notes.join("; ") };
      });
      const compose = (list: EmailStudentInput[]) =>
        engine.generateParentEmails({
          teacherName: teacher?.fullName ?? "cô giáo",
          className: cls?.name ?? "",
          dateLabel: dateLabel(new Date()),
          lesson: plan ? { gameName: plan.gameName ?? "", objectives: plan.objectives } : undefined,
          overallNote: input.overallNote,
          students: list,
        });

      const generated = new Map<string, { subject: string; body: string }>();
      const generateAll = async (list: EmailStudentInput[]) => {
        for (let i = 0; i < list.length; i += BATCH_SIZE) {
          for (const e of await compose(list.slice(i, i + BATCH_SIZE))) {
            if (list.some((s) => s.id === e.studentId)) generated.set(e.studentId, { subject: oneLine(e.subject), body: e.body });
          }
        }
      };
      const clean = (id: string) => {
        const e = generated.get(id);
        return e ? { studentId: id, ...sanitizeDeep(e).value } : undefined;
      };

      await generateAll(inputs);
      // Thư lỡ nhắc bé khác: soạn lại đúng những bé đó một lần
      const leaking = () => inputs.filter((s) => { const e = clean(s.id); return !e || leaks(e, students).length > 0; });
      const retry = leaking();
      if (retry.length) {
        retry.forEach((s) => generated.delete(s.id));
        await generateAll(retry);
      }
      const bad = leaking();
      if (bad.length) throw new FlowError(`AI soạn thư cho ${bad.map((s) => s.name).join(", ")} chưa đạt (thiếu thư hoặc nhắc tới bé khác). Cô bấm thử lại giúp mình nhé.`);

      const drafts: ParentEmailDraft[] = inputs.map((s) => {
        const e = clean(s.id)!;
        const student = students.find((x) => x.id === s.id)!;
        return { studentId: s.id, studentName: s.name, kind: s.kind, recipients: recipientsOf(student), subject: e.subject, body: e.body };
      });

      await audit.log({ userId: actor.id, action: "draft_parent_emails", target: classId, details: `${drafts.length} thư; ${notes.size} bé có ghi chú` });
      return { planId: plan?.id ?? null, lessonTitle: plan?.gameName ?? "", drafts, mailerReady: Boolean(mailer) };
    },

    /**
     * Gửi thư (chỉ khi cô bấm nút). Địa chỉ nhận LUÔN lấy lại từ danh bạ lớp ở server; nội dung do cô đã xem/sửa
     * nhưng vẫn kiểm tra lại từ ngữ cấm và tên bé khác trước khi gửi.
     */
    async send(actor: Actor, body: SendEmailsBody): Promise<{ results: EmailSendResult[] }> {
      const classId = classOf(actor);
      if (!mailer) throw new FlowError(NO_MAILER);
      const students = await repos.students.listWithParents(classId);
      const byId = new Map(students.map((s) => [s.id, s]));
      const replyTo = (await repos.users.findById(actor.id))?.email ?? undefined;
      const teacherName = (await repos.users.findById(actor.id))?.fullName ?? "";
      const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
      const results: EmailSendResult[] = [];

      for (const item of body.emails) {
        const student = byId.get(item.studentId);
        if (!student) throw new PermissionError("Bé không thuộc lớp bạn phụ trách");
        const base = { studentId: student.id, studentName: student.fullName, sentTo: [] as string[] };
        const subject = oneLine(item.subject);

        const language = checkLanguage(`${subject}\n${item.body}`);
        if (!language.passed) {
          results.push({ ...base, status: "failed", error: `Thư còn từ ngữ không phù hợp: ${language.violations.join("; ")}` });
          continue;
        }
        const others = findOtherStudentNames(`${subject}\n${item.body}`, student, students);
        if (others.length) {
          results.push({ ...base, status: "failed", error: `Thư nhắc tới bé khác (${others.join(", ")}). Cô xoá tên đó rồi gửi lại.` });
          continue;
        }

        const targets = student.parents.filter((l) => l.parent.email);
        if (!targets.length) {
          results.push({ ...base, status: "no_email" });
          continue;
        }

        const hash = fingerprint(subject, item.body);
        const text = `${item.body.trim()}\n\n—\nThư được gửi qua StuGuide thay cô ${teacherName}. Phụ huynh có thể trả lời trực tiếp thư này để trao đổi với cô.`;
        let sentCount = 0;
        let duplicateCount = 0;
        let failure: string | undefined;
        for (const link of targets) {
          const target = `${student.id}:${link.parent.id}`;
          const previous = await repos.audit.findRecent(SEND_ACTION, target, since);
          if (previous?.details?.startsWith(hash)) {
            duplicateCount++;
            continue;
          }
          try {
            await mailer.send({ to: link.parent.email!, subject, text, replyTo });
            await audit.log({ userId: actor.id, action: SEND_ACTION, target, details: `${hash} · ${link.parent.email}` });
            base.sentTo.push(link.parent.email!);
            sentCount++;
          } catch {
            // không đưa thông báo lỗi SMTP thô lên giao diện (có thể chứa tên máy chủ/tài khoản)
            failure = `Không gửi được tới ${link.parent.email}. Cô kiểm tra lại địa chỉ hoặc cấu hình email rồi thử lại.`;
          }
        }
        if (failure && sentCount === 0) results.push({ ...base, status: "failed", error: failure });
        else if (sentCount > 0) results.push({ ...base, status: "sent", ...(failure ? { error: failure } : {}) });
        else results.push({ ...base, status: duplicateCount ? "duplicate" : "failed" });
      }
      return { results };
    },
  };
}
export type ParentEmailService = ReturnType<typeof createParentEmailService>;
