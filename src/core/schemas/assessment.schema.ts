import { z } from "zod";
import { ASSESSMENT_RATINGS } from "../constants/status";
import { idSchema } from "./common.schema";

export const ratingSchema = z.enum(ASSESSMENT_RATINGS);

export const checklistOutputSchema = z.object({
  criteria: z.array(z.string().trim().min(1).max(300).describe("Một hành vi quan sát được")).min(3).max(5),
});

/** Chỉ số tiêu chí trong checklist ("0", "1", …); service đối chiếu với số tiêu chí thật. */
const criterionIndex = z.string().regex(/^\d{1,2}$/, "Chỉ số tiêu chí không hợp lệ");

export const assessmentEntrySchema = z.strictObject({
  studentId: idSchema,
  overallRating: ratingSchema,
  ratings: z.record(criterionIndex, ratingSchema),
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự").optional(),
});

export const saveAssessmentInputSchema = z.strictObject({
  checklistId: idSchema,
  entries: z
    .array(assessmentEntrySchema)
    .min(1, "Chưa có đánh giá nào")
    .max(60)
    .refine((list) => new Set(list.map((e) => e.studentId)).size === list.length, "Mỗi bé chỉ được đánh giá một lần trong một lần lưu"),
});

export const behaviorAnalysisOutputSchema = z.object({
  pattern: z.string().trim().min(1).max(1000).describe("Quy luật hành vi quan sát được"),
  skillArea: z.string().trim().min(1).max(120).describe("Tên nhóm kỹ năng bé cần hỗ trợ"),
  suggestedActivity: z.string().trim().min(1).max(1500).describe("Tên và cách chơi trò chơi hỗ trợ riêng"),
});

export type ChecklistOutput = z.infer<typeof checklistOutputSchema>;
export type AssessmentEntry = z.infer<typeof assessmentEntrySchema>;
export type SaveAssessmentInput = z.infer<typeof saveAssessmentInputSchema>;
export type BehaviorAnalysisOutput = z.infer<typeof behaviorAnalysisOutputSchema>;
