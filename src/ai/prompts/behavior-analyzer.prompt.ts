import { composePrompt, revisionSection, type Revision } from "../prompt-composer";
import { formatCriteria } from "../quality/rubric";
import { behaviorRubric } from "../quality/rubrics";
import type { BehaviorAnalysisOutput } from "@/core/schemas/assessment.schema";
import { systemIdentity } from "./_shared/system-identity";
import { languageRules } from "./_shared/language-rules";
import { UNTRUSTED_RULE, fenceUntrusted } from "./_shared/untrusted";

export interface BehaviorPromptArgs {
  studentName: string;
  weekCount: number;
  /** Các tiêu chí quan sát của bài gần nhất */
  criteria: string[];
  /** Tiêu chí bé còn "cần rèn thêm" ở lần ghi nhận gần nhất */
  weakCriteria: string[];
  /** Ghi chú của cô theo tuần (cũ → mới) */
  notes: string[];
  revision?: Revision<BehaviorAnalysisOutput>;
}

export function composeBehaviorPrompt(args: BehaviorPromptArgs): string {
  return composePrompt([
    [null, systemIdentity],
    [null, languageRules],
    [null, UNTRUSTED_RULE],
    [
      "NHIỆM VỤ",
      `Bé ${args.studentName} có ${args.weekCount} tuần liên tiếp ở mức "cần rèn thêm". Hãy giúp cô nhìn ra quy luật hành vi từ dữ liệu quan sát, gọi tên nhóm kỹ năng bé cần hỗ trợ, và đề xuất một trò chơi hỗ trợ riêng.`,
    ],
    ["TIÊU CHÍ QUAN SÁT CỦA BÀI", args.criteria.map((c) => `- ${c}`).join("\n")],
    ["TIÊU CHÍ BÉ CÒN CẦN RÈN (lần gần nhất)", args.weakCriteria.length ? args.weakCriteria.map((c) => `- ${c}`).join("\n") : "(cô chưa tích riêng tiêu chí nào)"],
    ["GHI CHÚ QUAN SÁT CỦA CÔ (cũ → mới)", args.notes.length ? fenceUntrusted("ghi chú của cô", args.notes.map((n, i) => `Tuần ${i + 1}: ${n}`)) : "(không có ghi chú)"],
    ["TIÊU CHÍ ĐÁNH GIÁ", formatCriteria(behaviorRubric)],
    revisionSection(args.revision),
  ]);
}
