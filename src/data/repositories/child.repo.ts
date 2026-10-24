import type { Db } from "../prisma";
import type { SessionEvent } from "@/core/schemas/family.schema";

export type MemorySource = "parent" | "ai-session" | "teacher";

export function createChildRepo(db: Db) {
  return {
    memories: (studentId: string) => db.childMemory.findMany({ where: { studentId }, orderBy: { createdAt: "asc" } }),
    findMemory: (id: string) => db.childMemory.findUnique({ where: { id }, include: { student: true } }),
    addMemory: (data: { studentId: string; content: string; source: MemorySource; authorId?: string | null }) =>
      db.childMemory.create({ data: { ...data, authorId: data.authorId ?? null } }),
    removeMemory: (id: string) => db.childMemory.delete({ where: { id } }),

    findSession: (id: string) => db.learningSession.findUnique({ where: { id } }),
    /** Tạo hoặc cập nhật phiên trong một câu lệnh (an toàn khi nhiều beacon tới cùng lúc). */
    upsertSession: (data: { id: string; studentId: string; parentId: string; events: SessionEvent[]; transcript: unknown[]; lastSeq: number; distilled?: boolean }) => {
      const { id, studentId, parentId, ...rest } = data;
      const values = { ...rest, events: rest.events as never, transcript: rest.transcript as never, endedAt: new Date() };
      return db.learningSession.upsert({ where: { id }, create: { id, studentId, parentId, ...values }, update: values });
    },
    updateSession: (id: string, data: { events?: SessionEvent[]; transcript?: unknown[]; lastSeq?: number; summary?: string; distilled?: boolean; endedAt?: Date }) =>
      db.learningSession.update({ where: { id }, data: { ...data, events: data.events as never, transcript: data.transcript as never } }),
    recentSessions: (studentId: string, limit = 5) =>
      db.learningSession.findMany({ where: { studentId, summary: { not: "" } }, orderBy: { updatedAt: "desc" }, take: limit }),
  };
}
