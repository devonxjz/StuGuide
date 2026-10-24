import { composePrompt, revisionSection, type Revision } from "../prompt-composer";
import { formatCriteria } from "../quality/rubric";
import { lessonPlanRubric } from "../quality/rubrics";
import { getAgeLabel } from "@/core/constants/age-groups";
import { getAreaLabel } from "@/core/constants/development-areas";
import type { CreatePlanInput } from "@/core/schemas/form-inputs.schema";
import type { LessonPlanOutput } from "@/core/schemas/lesson-plan.schema";
import { systemIdentity } from "./_shared/system-identity";
import { languageRules } from "./_shared/language-rules";
import { UNTRUSTED_RULE, fenceUntrusted } from "./_shared/untrusted";

/** Bối cảnh làm việc của cô: AI dùng để hiểu lớp, tránh lặp lại và cá nhân hóa – không phải mẫu để chép. */
export interface PlanningContext {
  className?: string;
  /** Trí nhớ dài hạn của cô về lớp / cách làm việc */
  teacherMemories: string[];
  /** Giáo án gần đây của lớp (mới → cũ) */
  recentPlans: { gameName: string | null; topic: string; developmentArea: string }[];
}

export interface LessonPlannerPromptArgs {
  input: CreatePlanInput;
  context: PlanningContext;
  legalContext: string;
  safetyContext: string;
  /** Tri thức bổ sung (trò chơi dân gian, STEM) khi cô bật */
  extraContext?: string;
  revision?: Revision<LessonPlanOutput>;
}

export function composeLessonPlannerPrompt({ input, context, legalContext, safetyContext, extraContext, revision }: LessonPlannerPromptArgs): string {
  const classInfo = [
    context.className && `Lớp: ${context.className}`,
    `Độ tuổi: ${getAgeLabel(input.ageGroup)}`,
    `Mảng phát triển trọng tâm: ${getAreaLabel(input.developmentArea)}`,
    `Chủ đề: ${input.topic}`,
    `Học liệu cô có sẵn: ${input.materials.join(", ")}`,
    `Thời lượng: ${input.duration} phút · Không gian: ${input.space === "indoor" ? "trong lớp" : "ngoài sân"}`,
    input.stemEnabled && "Cô muốn tích hợp khám phá STEM (trẻ tự đặt câu hỏi, tự thử; cô gợi mở, không giảng giải)",
    input.folkGameEnabled && "Cô muốn lồng ghép trò chơi dân gian / đồng dao Việt Nam (giữ luật chơi cốt lõi, đổi bối cảnh cho hợp chủ đề)",
  ]
    .filter(Boolean)
    .map((l) => `- ${l}`)
    .join("\n");

  const recent = context.recentPlans.length
    ? context.recentPlans.map((p) => `- "${p.gameName ?? "chưa đặt tên"}" · ${p.topic} · ${getAreaLabel(p.developmentArea)}`).join("\n")
    : "";

  return composePrompt([
    [null, systemIdentity],
    [null, languageRules],
    [null, UNTRUSTED_RULE],
    [
      "NHIỆM VỤ",
      "Thiết kế một trò chơi học tập thực tế cho lớp dưới đây: từ ý tưởng, câu chuyện, cách chơi tới lời dẫn và học liệu in. Bạn toàn quyền sáng tạo nội dung và cách tổ chức; hãy dựa vào bối cảnh thật của lớp và kho tri thức đã tra cứu.",
    ],
    ["THÔNG TIN LỚP HỌC", classInfo],
    ["LƯU Ý CỦA CÔ CHO BÀI NÀY", input.classNotes ? fenceUntrusted("lưu ý của cô", input.classNotes) : null],
    ["ĐIỀU ĐÃ BIẾT VỀ CÔ VÀ LỚP", context.teacherMemories.length ? fenceUntrusted("trí nhớ dài hạn", context.teacherMemories) : null],
    ["CÁC TRÒ CHƠI LỚP ĐÃ DÙNG GẦN ĐÂY (để không lặp lại, có thể nối tiếp mạch học)", recent],
    ["CĂN CỨ PHÁP LÝ (tra cứu từ kho tri thức)", legalContext || "(không tìm thấy căn cứ phù hợp – đặt isVerified = false)"],
    ["QUY TẮC AN TOÀN THEO THÔNG TƯ 45 (tra cứu từ kho tri thức)", safetyContext || "(không có quy tắc bổ sung)"],
    ["TRI THỨC BỔ SUNG", extraContext],
    ["TIÊU CHÍ ĐÁNH GIÁ", formatCriteria(lessonPlanRubric)],
    revisionSection(revision),
  ]);
}
