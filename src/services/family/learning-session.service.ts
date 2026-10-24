import { NotFoundError } from "@/core/errors";
import { PermissionError } from "@/core/guardrails";
import { checkLanguage, sanitizeDeep } from "@/core/guardrails/language-guard";
import { sessionPayloadSchema, type SessionEvent } from "@/core/schemas/family.schema";
import type { Repositories } from "@/data/repositories";
import type { Actor } from "../types";
import type { ChildProfileService } from "./child-profile.service";

export interface DistillArgs {
  studentName: string;
  ageLabel: string;
  existingMemories: string[];
  transcript: { role: "parent" | "assistant"; text: string }[];
  events: SessionEvent[];
}
export type DistillFn = (args: DistillArgs) => Promise<{ summary: string; facts: string[] }>;

const MAX_FACTS = 5;

/**
 * Phiên dùng ở nhà. Bộ nhớ ngắn hạn nằm ở RAM trình duyệt; khi đóng/ẩn tab, client đẩy lên đây (idempotent theo sessionId + seq),
 * rồi AI chắt lọc thành trí nhớ dài hạn của bé (ChildMemory) – chỉ khi phiên có dữ liệu mới so với lần chắt lọc trước.
 */
export function createLearningSessionService({ repos, profiles, distiller }: { repos: Repositories; profiles: ChildProfileService; distiller: DistillFn }) {
  return {
    async ingest(actor: Actor, raw: unknown, options: { distillNow?: boolean } = {}) {
      if (actor.role !== "parent") throw new PermissionError("Chỉ phụ huynh được ghi phiên học ở nhà");
      const payload = sessionPayloadSchema.parse(raw);
      await profiles.assertAccess(actor, payload.studentId);

      const existing = await repos.children.findSession(payload.sessionId);
      if (existing && (existing.parentId !== actor.id || existing.studentId !== payload.studentId)) {
        throw new PermissionError("Phiên này thuộc về người khác");
      }

      const lastSeq = existing?.lastSeq ?? 0;
      const fresh = payload.events.filter((e) => e.seq > lastSeq);
      const mergedEvents = [...((existing?.events as SessionEvent[] | undefined) ?? []), ...fresh].slice(-500);
      const prevTranscript = (existing?.transcript as unknown[] | undefined) ?? [];
      // client luôn gửi toàn bộ cửa sổ hội thoại: chỉ nhận bản dài hơn (không để gói đến muộn ghi đè bản mới)
      const transcript = payload.transcript.length >= prevTranscript.length ? payload.transcript : prevTranscript;
      const newSeq = Math.max(lastSeq, ...payload.events.map((e) => e.seq), 0);
      const changed = !existing || fresh.length > 0 || transcript.length !== prevTranscript.length;

      // upsert: hai beacon (visibilitychange + pagehide) tới cùng lúc cho phiên mới không làm hỏng request thứ hai
      await repos.children.upsertSession({
        id: payload.sessionId,
        studentId: payload.studentId,
        parentId: actor.id,
        events: mergedEvents,
        transcript,
        lastSeq: newSeq,
        ...(changed ? { distilled: false } : {}),
      });
      const needsDistill = changed || existing?.distilled === false;
      if (options.distillNow && needsDistill) await this.distill(payload.sessionId);
      return { sessionId: payload.sessionId, lastSeq: newSeq, needsDistill };
    },

    /** AI chắt lọc phiên thành tóm tắt + tối đa 5 điều đáng nhớ về bé. Phiên đã chắt lọc và không đổi thì bỏ qua. */
    async distill(sessionId: string): Promise<{ skipped: true } | { skipped: false; facts: string[] }> {
      const session = await repos.children.findSession(sessionId);
      if (!session) throw new NotFoundError("phiên học");
      if (session.distilled) return { skipped: true };
      const transcript = (session.transcript as DistillArgs["transcript"]) ?? [];
      const events = (session.events as SessionEvent[]) ?? [];
      if (transcript.length < 2 && !events.some((e) => e.type === "note")) return { skipped: true };

      const student = await repos.students.findById(session.studentId);
      if (!student) throw new NotFoundError("bé");
      const existingMemories = (await repos.children.memories(session.studentId)).map((m) => m.content);
      const result = await distiller({ studentName: student.fullName, ageLabel: student.class.ageLabel, existingMemories, transcript, events });

      const summary = sanitizeDeep(result.summary).value.slice(0, 400);
      // BR-004: điều nào chứa nhãn chẩn đoán thì BỎ HẲN (không lưu bản bị thay chữ làm méo nghĩa)
      const facts = result.facts.filter((f) => checkLanguage(f).passed).slice(0, MAX_FACTS);
      for (const fact of facts) await profiles.addMemory(session.studentId, fact, "ai-session", session.parentId).catch(() => undefined);
      await repos.children.updateSession(sessionId, { summary, distilled: true });
      return { skipped: false, facts };
    },
  };
}
export type LearningSessionService = ReturnType<typeof createLearningSessionService>;
