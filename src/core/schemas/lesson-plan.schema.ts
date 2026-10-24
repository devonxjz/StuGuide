import { z } from "zod";

/**
 * Hợp đồng dữ liệu của giáo án (để lưu và hiển thị). Schema chỉ quy định HÌNH DẠNG dữ liệu và giới hạn an toàn;
 * chất lượng nội dung do tiêu chí đánh giá ở src/ai/quality/rubrics.ts quyết định.
 */
const text = (max: number) => z.string().trim().min(1).max(max);

export const legalReferenceSchema = z.object({
  documentCode: z.string().max(120).describe("Số hiệu văn bản, lấy đúng từ kho tri thức đã tra cứu; để trống nếu không có căn cứ phù hợp"),
  relevantSection: z.string().max(300).describe("Phần/điều khoản liên quan"),
  summary: z.string().max(1000).describe("Nội dung của căn cứ áp dụng cho bài học này"),
  isVerified: z.boolean().describe("true chỉ khi số hiệu có trong phần căn cứ đã tra cứu"),
});

export const safetyWarningSchema = z.object({
  level: z.enum(["critical", "warning", "info"]),
  material: text(200).describe("Vật liệu hoặc hoạt động liên quan"),
  description: text(1000).describe("Nội dung cảnh báo bằng tiếng Việt"),
  ruleRef: z.string().max(120).describe("Nguồn quy tắc, lấy đúng số hiệu từ kho tri thức"),
});

export const procedureStepSchema = z.object({
  phase: z.enum(["warmup", "main", "cooldown"]).describe("warmup: khởi động, main: hoạt động chính, cooldown: kết thúc/thư giãn"),
  title: text(200),
  duration: z.number().min(0).max(120).describe("Thời lượng ước tính (phút)"),
  instructions: text(3000).describe("Hướng dẫn cho cô giáo"),
  teacherTip: z.string().max(1000).describe("Mẹo xử lý tình huống sư phạm"),
});

export const flashcardSchema = z.object({
  text: text(300).describe("Nội dung flashcard để in và tô màu cùng trẻ"),
  emoji: z.string().max(16).describe("Một biểu tượng emoji minh họa đúng nội dung flashcard"),
});
export type Flashcard = z.infer<typeof flashcardSchema>;

/** Cấu trúc AI phải trả về (withStructuredOutput) */
export const lessonPlanOutputSchema = z.object({
  gameName: text(120).describe("Tên trò chơi"),
  legalReference: legalReferenceSchema,
  safetyWarnings: z.array(safetyWarningSchema).min(1).max(15),
  objectives: z.array(text(400)).min(1).max(6).describe("Mục tiêu bài học, mỗi mục tiêu một câu"),
  preparation: z.array(text(300)).min(1).max(20).describe("Đồ dùng cần chuẩn bị"),
  procedure: z.array(procedureStepSchema).min(1).max(10).describe("Tiến trình hoạt động theo thứ tự"),
  teacherScript: text(6000).describe("Lời dẫn cô có thể đọc ngay khi tổ chức"),
  flashcards: z.array(flashcardSchema).max(12).describe("Học liệu in (nếu trò chơi cần)"),
  observationCriteria: z.array(text(300)).min(3).max(5).describe("Hành vi quan sát cuối ngày"),
  eqQuestions: z.array(text(300)).min(2).max(3).describe("Câu hỏi để phụ huynh trò chuyện với con buổi tối"),
});

export type LegalReference = z.infer<typeof legalReferenceSchema>;
export type SafetyWarning = z.infer<typeof safetyWarningSchema>;
export type ProcedureStep = z.infer<typeof procedureStepSchema>;
export type LessonPlanOutput = z.infer<typeof lessonPlanOutputSchema>;

/** Các phần có thể sửa / viết lại bằng AI (màn hình 4) */
export const EDITABLE_SECTIONS = ["gameName", "objectives", "preparation", "procedure", "teacherScript", "safetyWarnings"] as const;
export type EditableSection = (typeof EDITABLE_SECTIONS)[number];

/** Giá trị hợp lệ cho từng phần khi sửa tay hoặc nhờ AI viết lại (bọc trong { value }) */
export const sectionSchemas = {
  gameName: z.object({ value: lessonPlanOutputSchema.shape.gameName }),
  teacherScript: z.object({ value: lessonPlanOutputSchema.shape.teacherScript }),
  objectives: z.object({ value: lessonPlanOutputSchema.shape.objectives }),
  preparation: z.object({ value: lessonPlanOutputSchema.shape.preparation }),
  procedure: z.object({ value: lessonPlanOutputSchema.shape.procedure }),
  safetyWarnings: z.object({ value: lessonPlanOutputSchema.shape.safetyWarnings }),
} satisfies Record<EditableSection, z.ZodType>;
