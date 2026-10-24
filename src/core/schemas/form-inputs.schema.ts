import { z } from "zod";
import { AGE_GROUP_VALUES } from "../constants/age-groups";
import { DEVELOPMENT_AREA_VALUES } from "../constants/development-areas";

/** ERR-INPUT-01: thiếu tuổi / chủ đề / vật liệu thì chặn trước khi gọi AI. Mọi chuỗi đều có giới hạn độ dài. */
export const createPlanInputSchema = z.strictObject({
  ageGroup: z.enum(AGE_GROUP_VALUES, { error: "Vui lòng chọn độ tuổi" }),
  developmentArea: z.enum(DEVELOPMENT_AREA_VALUES, { error: "Vui lòng chọn mảng phát triển" }),
  topic: z.string({ error: "Vui lòng nhập chủ đề bài dạy" }).trim().min(1, "Vui lòng nhập chủ đề bài dạy").max(120, "Chủ đề tối đa 120 ký tự"),
  materials: z
    .array(z.string().trim().min(1).max(80, "Tên học liệu tối đa 80 ký tự"), { error: "Vui lòng chọn ít nhất một học liệu" })
    .min(1, "Vui lòng chọn ít nhất một học liệu")
    .max(15, "Tối đa 15 học liệu")
    .transform((list) => [...new Set(list)]),
  duration: z.union([z.literal(15), z.literal(20), z.literal(25), z.literal(30)], { error: "Thời lượng phải là 15, 20, 25 hoặc 30 phút" }).default(20),
  space: z.enum(["indoor", "outdoor"]).default("indoor"),
  stemEnabled: z.boolean().default(false),
  folkGameEnabled: z.boolean().default(false),
  classNotes: z.string().trim().max(1000, "Lưu ý tối đa 1000 ký tự").optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanInputSchema>;
