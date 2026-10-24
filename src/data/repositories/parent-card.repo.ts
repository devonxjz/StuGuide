import { randomBytes } from "node:crypto";
import type { Db } from "../prisma";
import type { ParentCardContent } from "@/core/schemas/parent-card.schema";
import type { FeedbackResponse } from "@/core/constants/status";

export function createParentCardRepo(db: Db) {
  return {
    create: (data: { lessonPlanId: string; classId: string; content: ParentCardContent; date?: Date }) =>
      db.parentCard.create({ data: { ...data, date: data.date ?? new Date(), status: "draft" } }),

    findById: (id: string) => db.parentCard.findUnique({ where: { id }, include: { lessonPlan: true } }),

    findLatestByClass: (classId: string) =>
      db.parentCard.findFirst({ where: { classId }, orderBy: { date: "desc" }, include: { lessonPlan: true } }),

    findByPlan: (lessonPlanId: string) =>
      db.parentCard.findFirst({ where: { lessonPlanId }, orderBy: { date: "desc" } }),

    updateContent: (id: string, content: ParentCardContent) => db.parentCard.update({ where: { id }, data: { content } }),

    /** Phát hành thẻ: đặt status=sent và sinh token riêng cho từng cặp (bé, phụ huynh). */
    async markSent(cardId: string, links: { studentId: string; parentId: string }[]) {
      const tokens = links.map((l) => ({ ...l, cardId, token: randomBytes(18).toString("base64url") }));
      await db.$transaction([
        db.parentCard.update({ where: { id: cardId }, data: { status: "sent" } }),
        ...tokens.map((t) =>
          db.parentToken.upsert({
            where: { cardId_studentId_parentId: { cardId, studentId: t.studentId, parentId: t.parentId } },
            create: t,
            update: {},
          }),
        ),
      ]);
      return db.parentToken.findMany({ where: { cardId }, include: { student: true } });
    },

    /** Link của đúng phụ huynh + đúng bé (+ đúng bài nếu chỉ định) trên thẻ đã gửi; phụ huynh nhiều con không bị lẫn link. */
    tokenFor: ({ parentId, studentId, lessonPlanId }: { parentId: string; studentId: string; lessonPlanId?: string }) =>
      db.parentToken.findFirst({ where: { parentId, studentId, card: { status: "sent", ...(lessonPlanId && { lessonPlanId }) } }, orderBy: { createdAt: "desc" } }),

    listTokens: (cardId: string) => db.parentToken.findMany({ where: { cardId }, include: { student: true } }),

    findByToken: (token: string) =>
      db.parentToken.findUnique({
        where: { token },
        include: { card: { include: { lessonPlan: true } }, student: { include: { class: true } }, parent: true },
      }),

    upsertFeedback(data: { cardId: string; studentId: string; parentId: string; response: FeedbackResponse; message?: string }) {
      const { cardId, studentId } = data;
      return db.parentFeedback.upsert({
        where: { cardId_studentId: { cardId, studentId } },
        create: { ...data, message: data.message ?? null },
        update: { response: data.response, message: data.message ?? null, respondedAt: new Date() },
      });
    },

    listFeedbacks: (cardId: string) =>
      db.parentFeedback.findMany({ where: { cardId }, include: { student: true }, orderBy: { respondedAt: "desc" } }),

    /** Tổng số phụ huynh được mời và đã phản hồi trong toàn trường (cho KPI của BGH) */
    async engagementTotals(schoolId: string) {
      const where = { card: { lessonPlan: { class: { schoolId } } } };
      const [invited, responded] = await Promise.all([db.parentToken.count({ where }), db.parentFeedback.count({ where })]);
      return { invited, responded };
    },

    findFeedback: (cardId: string, studentId: string) =>
      db.parentFeedback.findUnique({ where: { cardId_studentId: { cardId, studentId } } }),
  };
}
