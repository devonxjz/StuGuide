import { z } from "zod";
import { idSchema } from "./common.schema";

const text = (max: number) => z.string().trim().min(1).max(max);

/** Hoạt động ngắn ở nhà do AI cá nhân hóa cho từng bé (phụ huynh dẫn dắt, đồ vật thật, Screen-Free). */
export const homeActivitySchema = z.object({
  title: text(150).describe("Tên hoạt động"),
  minutes: z.number().min(1).max(30).describe("Thời lượng (phút)"),
  whyForThisChild: text(800).describe("Vì sao hợp với bé này, dựa trên điều có trong hồ sơ"),
  materials: z.array(text(150)).min(1).max(10).describe("Đồ vật thật có sẵn trong nhà"),
  steps: z.array(text(500)).min(1).max(8).describe("Các bước để phụ huynh cùng chơi với bé"),
  eqQuestion: text(300).describe("Một câu hỏi mở để bố mẹ trò chuyện với bé"),
  parentTip: text(500).describe("Mẹo cho bố mẹ khi bé mất hứng/ngại"),
});
export type HomeActivity = z.infer<typeof homeActivitySchema>;

/** Dữ liệu kèm sự kiện: phẳng, chỉ giá trị nguyên thủy, giới hạn số khóa và độ dài (không để client nhét object tùy ý vào DB). */
const eventData = z
  .record(z.string().max(40), z.union([z.string().max(500), z.number(), z.boolean(), z.null()]))
  .refine((d) => Object.keys(d).length <= 10, "Dữ liệu sự kiện quá nhiều trường");

export const sessionEventSchema = z.strictObject({
  seq: z.number().int().min(1).max(1_000_000),
  type: z.enum(["view", "message", "activity-step", "reaction", "note"]),
  at: z.iso.datetime({ message: "Thời điểm sự kiện không hợp lệ" }),
  data: eventData.optional(),
});
export type SessionEvent = z.infer<typeof sessionEventSchema>;

/** Gói bộ nhớ ngắn hạn mà trình duyệt đẩy lên khi đóng/ẩn tab (idempotent theo sessionId + seq). */
export const sessionPayloadSchema = z.strictObject({
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "Mã phiên không hợp lệ"),
  studentId: idSchema,
  events: z.array(sessionEventSchema).max(500),
  transcript: z.array(z.strictObject({ role: z.enum(["parent", "assistant"]), text: z.string().max(4000) })).max(60),
});
export type SessionPayload = z.infer<typeof sessionPayloadSchema>;
