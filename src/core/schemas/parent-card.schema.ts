import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);

/** Nội dung thẻ phụ huynh (AI sinh, cô có thể sửa trước khi gửi). */
export const parentCardContentSchema = z.object({
  greeting: text(500).describe("Lời chào gửi phụ huynh"),
  classSummary: text(1500).describe("Hôm nay ở lớp con đã làm gì"),
  missionTitle: text(200).describe("Tên nhiệm vụ tối nay"),
  duration: z.number().int().min(1).max(30).default(5),
  eqQuestions: z.array(text(300)).min(2).max(3),
  adultRole: text(800).describe("Vai trò của bố mẹ khi trò chuyện với con"),
});

/** Cô sửa thẻ qua API: không chấp nhận trường lạ. */
export const parentCardEditSchema = parentCardContentSchema.strict();

export type ParentCardContent = z.infer<typeof parentCardContentSchema>;
