import { InputError } from "@/core/errors";
import type { Db } from "../prisma";
import type { StoredMessage } from "@/ai/memory/context-builder";
import type { StuGuideMessage } from "@/types/chat";

export function createConversationRepo(db: Db) {
  return {
    find: (id: string) => db.conversation.findUnique({ where: { id } }),
    create: (id: string, userId: string, title?: string) => db.conversation.create({ data: { id, userId, ...(title && { title }) } }),
    list: (userId: string, limit = 30) => db.conversation.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: limit }),

    /** Thêm tin nhắn (idempotent theo id trong CÙNG cuộc trò chuyện: client gửi lại cùng id thì bỏ qua). */
    async append(conversationId: string, message: { id: string; role: "user" | "assistant"; parts: StuGuideMessage["parts"] }) {
      const exists = await db.chatMessage.findUnique({ where: { id: message.id } });
      if (exists) {
        // id trùng với tin của cuộc trò chuyện khác: không ghi đè, không lộ, báo lỗi đầu vào
        if (exists.conversationId !== conversationId) throw new InputError("Mã tin nhắn đã được dùng");
        return exists;
      }
      return db.$transaction(async (tx) => {
        const last = await tx.chatMessage.findFirst({ where: { conversationId }, orderBy: { seq: "desc" }, select: { seq: true } });
        const row = await tx.chatMessage.create({ data: { id: message.id, conversationId, seq: (last?.seq ?? 0) + 1, role: message.role, parts: message.parts as never } });
        await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
        return row;
      });
    },

    async messages(conversationId: string): Promise<(StoredMessage & { id: string })[]> {
      const rows = await db.chatMessage.findMany({ where: { conversationId }, orderBy: { seq: "asc" } });
      return rows.map((r) => ({ id: r.id, seq: r.seq, role: r.role as "user" | "assistant", parts: r.parts as StuGuideMessage["parts"] }));
    },

    setTitle: (id: string, title: string) => db.conversation.update({ where: { id }, data: { title } }),
    setSummary: (id: string, summary: string, summaryUpTo: number) => db.conversation.update({ where: { id }, data: { summary, summaryUpTo } }),
    setFocus: (id: string, focusPlanId: string | null) => db.conversation.update({ where: { id }, data: { focusPlanId } }),

    async remove(id: string) {
      await db.$transaction([db.chatMessage.deleteMany({ where: { conversationId: id } }), db.conversation.delete({ where: { id } })]);
    },
  };
}

export function createMemoryRepo(db: Db) {
  return {
    list: (userId: string) => db.teacherMemory.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    find: (id: string) => db.teacherMemory.findUnique({ where: { id } }),
    add: (userId: string, content: string) => db.teacherMemory.create({ data: { userId, content } }),
    remove: (id: string) => db.teacherMemory.delete({ where: { id } }),
  };
}
