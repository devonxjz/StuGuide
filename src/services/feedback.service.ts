import { assertParentOwnsStudent } from "@/core/guardrails";
import { NotFoundError } from "@/core/errors";
import { feedbackInputSchema } from "@/core/schemas/feedback.schema";
import { parentTokenSchema } from "@/core/schemas/common.schema";
import { parentCardContentSchema } from "@/core/schemas/parent-card.schema";
import type { ServiceDeps } from "./types";
import type { AuditService } from "./audit.service";
import type { ParentCardService } from "./parent-card.service";

export function createFeedbackService({ repos, events }: ServiceDeps, audit: AuditService, cards: ParentCardService) {
  /** Giải mã token -> (phụ huynh, bé, thẻ). Token lạ bị ghi nhật ký an ninh (ERR-AUTH-01). */
  const resolve = async (token: string) => {
    const rec = parentTokenSchema.safeParse(token).success ? await repos.parentCards.findByToken(token) : null;
    if (!rec || rec.card.status !== "sent") {
      // không ghi token vào nhật ký (là bí mật); chỉ ghi dấu vết để phát hiện dò link
      await audit.log({ userId: null, action: "access_denied", details: "Liên kết phụ huynh không hợp lệ hoặc thẻ chưa gửi" });
      throw new NotFoundError("liên kết này");
    }
    return rec;
  };

  return {
    /** Màn hình 7: chỉ trả dữ liệu của đúng bé được liên kết (BR-006). */
    async view(token: string) {
      const rec = await resolve(token);
      const teacher = await repos.users.primaryTeacherOfClass(rec.student.classId);
      const existing = await repos.parentCards.findFeedback(rec.cardId, rec.studentId);
      return {
        student: { id: rec.student.id, fullName: rec.student.fullName, emoji: rec.student.avatarEmoji ?? "👶", className: rec.student.class.name },
        teacherName: teacher?.fullName ?? "Cô giáo",
        gameName: rec.card.lessonPlan.gameName,
        card: parentCardContentSchema.parse(rec.card.content),
        feedback: existing ? { response: existing.response, message: existing.message } : null,
      };
    },

    /** Phản hồi 1 chạm; một phản hồi / bé / thẻ (đổi ý được). Phát sự kiện realtime cho cô giáo. */
    async submit(rawInput: unknown) {
      const input = feedbackInputSchema.parse(rawInput);
      const rec = await resolve(input.token);
      assertParentOwnsStudent(await repos.students.studentIdsOfParent(rec.parentId), rec.studentId);

      const feedback = await repos.parentCards.upsertFeedback({
        cardId: rec.cardId,
        studentId: rec.studentId,
        parentId: rec.parentId,
        response: input.response,
        message: input.message,
      });
      const stats = await cards.stats(rec.cardId);
      events.publishFeedback(rec.cardId, stats);
      await audit.log({ userId: rec.parentId, action: "parent_feedback", target: rec.cardId, details: input.response });
      return { feedback, stats };
    },
  };
}
export type FeedbackService = ReturnType<typeof createFeedbackService>;
