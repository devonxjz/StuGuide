import { composePrompt, revisionSection, type Revision } from "../prompt-composer";
import { formatCriteria } from "../quality/rubric";
import { homeActivityRubric } from "../quality/rubrics";
import type { HomeActivity } from "@/core/schemas/family.schema";
import { systemIdentity } from "./_shared/system-identity";
import { languageRules } from "./_shared/language-rules";
import { UNTRUSTED_RULE, fenceUntrusted } from "./_shared/untrusted";

export function composeHomeActivityPrompt(args: { profile: string; focus?: string; minutes: number; revision?: Revision<HomeActivity> }): string {
  return composePrompt([
    [null, systemIdentity],
    [null, languageRules],
    [null, UNTRUSTED_RULE],
    [
      "NHIỆM VỤ",
      `Thiết kế MỘT hoạt động khoảng ${args.minutes} phút ở nhà, cá nhân hóa cho đúng bé trong hồ sơ. Phụ huynh là người dẫn dắt, bé chơi với đồ vật thật. Bạn tự chọn ý tưởng và cách triển khai.`,
    ],
    ["HỒ SƠ CỦA BÉ", fenceUntrusted("hồ sơ của bé", args.profile)],
    ["ĐIỀU BỐ MẸ MUỐN", args.focus ? fenceUntrusted("yêu cầu của bố mẹ", args.focus) : "Bố mẹ không nêu cụ thể: chọn điều phù hợp nhất với bé và bài học gần đây ở lớp."],
    ["TIÊU CHÍ ĐÁNH GIÁ", formatCriteria(homeActivityRubric)],
    revisionSection(args.revision),
  ]);
}
