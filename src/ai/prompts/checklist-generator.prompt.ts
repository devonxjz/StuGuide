import { composePrompt, revisionSection, type Revision } from "../prompt-composer";
import { formatCriteria } from "../quality/rubric";
import { checklistRubric } from "../quality/rubrics";
import { systemIdentity } from "./_shared/system-identity";
import { languageRules } from "./_shared/language-rules";

export function composeChecklistPrompt(plan: { gameName: string; objectives: string[] }, revision?: Revision<string[]>): string {
  return composePrompt([
    [null, systemIdentity],
    [null, languageRules],
    ["NHIỆM VỤ", "Từ mục tiêu bài học, soạn các tiêu chí để cô quan sát và tích chọn nhanh cho từng bé vào cuối ngày."],
    ["TRÒ CHƠI", plan.gameName],
    ["MỤC TIÊU BÀI HỌC", plan.objectives.map((o) => `- ${o}`).join("\n")],
    ["TIÊU CHÍ ĐÁNH GIÁ", formatCriteria(checklistRubric)],
    revisionSection(revision),
  ]);
}
