import { composePrompt, revisionSection, type Revision } from "../prompt-composer";
import { formatCriteria } from "../quality/rubric";
import { parentCardRubric } from "../quality/rubrics";
import type { ParentCardContent } from "@/core/schemas/parent-card.schema";
import { systemIdentity } from "./_shared/system-identity";
import { languageRules } from "./_shared/language-rules";

export interface ParentCardPromptArgs {
  teacherName: string;
  className: string;
  plan: { gameName: string; objectives: string[]; teacherScript: string; eqQuestions: string[]; observationCriteria: string[] };
  revision?: Revision<ParentCardContent>;
}

export function composeParentCardPrompt(args: ParentCardPromptArgs): string {
  return composePrompt([
    [null, systemIdentity],
    [null, languageRules],
    [
      "NHIỆM VỤ",
      "Viết thẻ nhiệm vụ ngắn cô giáo gửi phụ huynh tối nay: giúp bố mẹ biết hôm nay con đã làm gì ở lớp và trò chuyện với con khoảng 5 phút trước giờ ngủ. Bạn tự chọn lời lẽ và cách diễn đạt phù hợp.",
    ],
    ["NGƯỜI GỬI", `${args.teacherName} – ${args.className}`],
    ["BÀI HỌC HÔM NAY", `${args.plan.gameName}\nMục tiêu:\n${args.plan.objectives.map((o) => `- ${o}`).join("\n")}`],
    ["LỜI DẪN CÔ ĐÃ DÙNG Ở LỚP", args.plan.teacherScript],
    ["CÂU HỎI EQ CỦA GIÁO ÁN (tham khảo, có thể viết lại cho hợp với bố mẹ)", args.plan.eqQuestions.map((q) => `- ${q}`).join("\n")],
    ["TIÊU CHÍ ĐÁNH GIÁ", formatCriteria(parentCardRubric)],
    revisionSection(args.revision),
  ]);
}
