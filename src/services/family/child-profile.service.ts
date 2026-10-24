import { getAreaLabel, DEVELOPMENT_AREAS } from "@/core/constants/development-areas";
import { getAgeLabel } from "@/core/constants/age-groups";
import { NotFoundError } from "@/core/errors";
import { PermissionError } from "@/core/guardrails";
import { sanitizeDeep } from "@/core/guardrails/language-guard";
import { parentCardContentSchema } from "@/core/schemas/parent-card.schema";
import type { Repositories } from "@/data/repositories";
import type { MemorySource } from "@/data/repositories/child.repo";
import type { Actor } from "../types";
import { canAccessStudent } from "../access";

export const MAX_CHILD_MEMORIES = 30;
const MAX_LENGTH = 200;
const normalize = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();

/** Tập từ (bỏ dấu câu) để so độ giống: AI chắt lọc hay diễn đạt lại cùng một ý bằng câu hơi khác. */
const words = (s: string) => new Set(normalize(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 1));
export function isNearDuplicate(a: string, b: string, threshold = 0.8): boolean {
  const A = words(a);
  const B = words(b);
  if (A.size === 0 || B.size === 0) return normalize(a).toLowerCase() === normalize(b).toLowerCase();
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter) >= threshold;
}

/** Khi vượt giới hạn: bỏ điều do AI chắt lọc cũ nhất trước, giữ điều phụ huynh/cô tự nhập. */
const EVICTION_ORDER: Record<string, number> = { "ai-session": 0, teacher: 1, parent: 2 };

export interface AreaProgress {
  area: string;
  label: string;
  total: number;
  excellent: number;
  achieved: number;
  practicing: number;
  /** Nhãn tích cực cho phụ huynh, không dán nhãn bé */
  level: "Tốt" | "Đã đạt" | "Đang rèn thêm";
}

/**
 * Hồ sơ cá nhân hóa từng bé. Quy tắc riêng tư (BR-006): phụ huynh chỉ thấy con mình; giáo viên chỉ thấy bé trong lớp;
 * phụ huynh KHÔNG thấy ghi chú của cô và cảnh báo quan sát sâu (tránh dán nhãn), chỉ thấy mức đạt theo mảng.
 */
export function createChildProfileService({ repos, audit }: { repos: Repositories; audit: { log: (e: { userId?: string | null; action: string; target?: string; details?: string }) => unknown } }) {
  const assertAccess = async (actor: Actor, studentId: string) => {
    const student = await repos.students.findById(studentId);
    const allowed = student ? await canAccessStudent(repos, actor, student) : false;
    if (!allowed || !student) {
      await audit.log({ userId: actor.id, action: "access_denied", target: studentId, details: `${actor.role} cố xem hồ sơ trẻ không thuộc quyền` });
      throw new PermissionError("Bạn chỉ có quyền xem thông tin của bé đã được nhà trường liên kết");
    }
    return student;
  };

  const progressOf = async (studentId: string): Promise<AreaProgress[]> => {
    const rows = await repos.students.assessmentsOfStudent(studentId);
    return DEVELOPMENT_AREAS.flatMap((a) => {
      const mine = rows.filter((r) => r.checklist.lessonPlan.developmentArea === a.value);
      if (mine.length === 0) return [];
      const count = (r: string) => mine.filter((m) => m.overallRating === r).length;
      const excellent = count("excellent");
      const achieved = count("achieved");
      const practicing = count("needs_practice");
      const level = practicing > excellent + achieved ? "Đang rèn thêm" : excellent >= achieved && excellent > 0 ? "Tốt" : "Đã đạt";
      return [{ area: a.value, label: a.label, total: mine.length, excellent, achieved, practicing, level } satisfies AreaProgress];
    });
  };

  const lessonsOf = async (student: { id: string; classId: string }, limit = 6) => {
    const plans = (await repos.lessonPlans.listByClass(student.classId, 30)).filter((p) => p.status === "shared").slice(0, limit);
    return Promise.all(
      plans.map(async (p) => {
        const card = await repos.parentCards.findByPlan(p.id);
        const content = card ? parentCardContentSchema.safeParse(card.content) : null;
        const mine = card ? await repos.parentCards.findFeedback(card.id, student.id) : null;
        return {
          planId: p.id,
          gameName: p.gameName ?? "",
          area: p.developmentArea,
          areaLabel: getAreaLabel(p.developmentArea),
          date: p.createdAt,
          summary: content?.success ? content.data.classSummary : (p.objectives[0] ?? ""),
          missionTitle: content?.success ? content.data.missionTitle : null,
          eqQuestions: content?.success ? content.data.eqQuestions : [],
          myResponse: (mine?.response ?? null) as "completed" | "needs_practice" | null,
        };
      }),
    );
  };

  const memories = async (actor: Actor, studentId: string) => {
    await assertAccess(actor, studentId);
    return repos.children.memories(studentId);
  };

  /** Ghi nhớ không cần actor (dùng nội bộ khi AI chắt lọc phiên học). Loại trùng (cả gần trùng), làm sạch, giữ tối đa 30 mục. */
  const addMemory = async (studentId: string, raw: string, source: MemorySource, authorId: string | null) => {
    const content = sanitizeDeep(normalize(raw).slice(0, MAX_LENGTH)).value;
    if (content.length < 3) throw new Error("Nội dung ghi nhớ trống");
    const existing = await repos.children.memories(studentId);
    const dup = existing.find((m) => (source === "ai-session" ? isNearDuplicate(m.content, content) : normalize(m.content).toLowerCase() === content.toLowerCase()));
    if (dup) return dup;
    const created = await repos.children.addMemory({ studentId, content, source, authorId });
    const overflow = existing.length + 1 - MAX_CHILD_MEMORIES;
    if (overflow > 0) {
      const victims = [...existing].sort((a, b) => (EVICTION_ORDER[a.source] ?? 0) - (EVICTION_ORDER[b.source] ?? 0) || a.createdAt.getTime() - b.createdAt.getTime()).slice(0, overflow);
      for (const old of victims) await repos.children.removeMemory(old.id);
    }
    return created;
  };

  return {
    assertAccess,
    memories,
    addMemory,

    async childrenOf(actor: Actor) {
      if (actor.role !== "parent") throw new PermissionError();
      const kids = await repos.students.childrenOfParent(actor.id);
      return kids.map((k) => ({ id: k.id, fullName: k.fullName, emoji: k.avatarEmoji ?? "👶", className: k.class.name, ageLabel: k.class.ageLabel }));
    },

    async overview(actor: Actor, studentId: string) {
      const student = await assertAccess(actor, studentId);
      const teacher = await repos.users.primaryTeacherOfClass(student.classId);
      const [recentLessons, progress, mems] = await Promise.all([lessonsOf(student), progressOf(studentId), repos.children.memories(studentId)]);
      return {
        sharedWithTeacher: student.profileSharedWithTeacher,
        student: { id: student.id, fullName: student.fullName, emoji: student.avatarEmoji ?? "👶", className: student.class.name, ageLabel: student.class.ageLabel, ageGroup: student.class.ageGroup, teacherName: teacher?.fullName ?? "Cô giáo" },
        recentLessons,
        progress,
        memories: mems.map((m) => ({ id: m.id, content: m.content, source: m.source as MemorySource })),
      };
    },

    /** Phụ huynh đồng ý / thu hồi việc cho cô giáo đọc hồ sơ cá nhân hóa của bé (có AuditLog). */
    async setSharing(actor: Actor, studentId: string, shared: boolean) {
      if (actor.role !== "parent") throw new PermissionError("Chỉ phụ huynh mới quyết định chia sẻ hồ sơ của bé");
      await assertAccess(actor, studentId);
      await repos.students.setProfileSharing(studentId, shared, actor.id);
      await audit.log({ userId: actor.id, action: shared ? "share_profile" : "revoke_profile", target: studentId, details: shared ? "Phụ huynh đồng ý chia sẻ hồ sơ với cô giáo" : "Phụ huynh thu hồi chia sẻ hồ sơ" });
      return { shared };
    },

    /**
     * Góc nhìn của cô giáo: chỉ đọc được khi phụ huynh đã đồng ý, và chỉ thấy những điều đã ghi nhớ về sở thích của bé
     * (không thấy hội thoại hay tóm tắt từng phiên dùng ở nhà).
     */
    async teacherView(actor: Actor, studentId: string) {
      if (actor.role !== "teacher") throw new PermissionError("Chỉ giáo viên chủ nhiệm xem được hồ sơ này");
      const student = await assertAccess(actor, studentId);
      const ref = { id: student.id, fullName: student.fullName };
      if (!student.profileSharedWithTeacher) return { shared: false as const, student: ref };
      const memories = await repos.children.memories(studentId);
      return { shared: true as const, student: ref, memories: memories.map((m) => ({ id: m.id, content: m.content, source: m.source as MemorySource })) };
    },

    /** Khối ngữ cảnh gửi cho AI của cô: chỉ gồm điều đã ghi nhớ (đã được phụ huynh đồng ý), không có dữ liệu phiên ở nhà. */
    async profileForTeacher(studentId: string): Promise<string> {
      const student = await repos.students.findById(studentId);
      if (!student) throw new NotFoundError("bé");
      const mems = await repos.children.memories(studentId);
      const lines = [
        `Bé: ${student.fullName}, ${getAgeLabel(student.class.ageGroup)} (${student.class.name}). Phụ huynh đã đồng ý chia sẻ những điều sau để cô cá nhân hóa:`,
        mems.length ? mems.map((m) => `- ${m.content}`).join("\n") : "(Phụ huynh chưa ghi nhớ điều gì riêng về bé.)",
      ];
      return sanitizeDeep(lines.join("\n")).value;
    },

    remember: async (actor: Actor, studentId: string, content: string, source: MemorySource = "parent") => {
      await assertAccess(actor, studentId);
      return addMemory(studentId, content, source, actor.id);
    },

    async forget(actor: Actor, memoryId: string) {
      const m = await repos.children.findMemory(memoryId);
      if (!m) throw new NotFoundError("mục ghi nhớ");
      await assertAccess(actor, m.studentId);
      await repos.children.removeMemory(memoryId);
    },

    /** Khối ngữ cảnh cá nhân hóa đưa cho AI (đã làm sạch, không chứa ghi chú của cô hay nhãn). */
    async profileForAI(studentId: string): Promise<string> {
      const student = await repos.students.findById(studentId);
      if (!student) throw new NotFoundError("bé");
      const [mems, progress, lessons, sessions] = await Promise.all([repos.children.memories(studentId), progressOf(studentId), lessonsOf(student, 4), repos.children.recentSessions(studentId, 3)]);
      const strong = progress.filter((p) => p.level !== "Đang rèn thêm").map((p) => p.label);
      const practicing = progress.filter((p) => p.practicing > 0).map((p) => p.label);
      const lines = [
        `Bé: ${student.fullName}, ${getAgeLabel(student.class.ageGroup)} (${student.class.name}).`,
        mems.length ? `Điều đã biết về bé:\n${mems.map((m) => `- ${m.content}`).join("\n")}` : "Chưa có ghi nhớ riêng về bé.",
        strong.length ? `Mảng bé làm tốt/đã đạt: ${strong.join(", ")}.` : "",
        practicing.length ? `Mảng bé đang rèn thêm (nói tích cực, không dán nhãn): ${practicing.join(", ")}.` : "",
        lessons.length ? `Bài học gần đây ở lớp: ${lessons.map((l) => `"${l.gameName}" (${l.areaLabel})`).join("; ")}.` : "",
        sessions.length ? `Những lần dùng gần đây ở nhà:\n${sessions.map((s) => `- ${s.summary}`).join("\n")}` : "",
      ];
      return sanitizeDeep(lines.filter(Boolean).join("\n")).value;
    },
  };
}
export type ChildProfileService = ReturnType<typeof createChildProfileService>;
