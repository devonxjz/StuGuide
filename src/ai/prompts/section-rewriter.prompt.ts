import { composePrompt, revisionSection, type Revision } from "../prompt-composer";
import { formatCriteria } from "../quality/rubric";
import { sectionRewriteRubric } from "../quality/rubrics";
import { getAgeLabel } from "@/core/constants/age-groups";
import type { EditableSection, LessonPlanOutput } from "@/core/schemas/lesson-plan.schema";
import { systemIdentity } from "./_shared/system-identity";
import { languageRules } from "./_shared/language-rules";
import { UNTRUSTED_RULE, fenceUntrusted } from "./_shared/untrusted";

export const SECTION_LABELS: Record<EditableSection, string> = {
  gameName: "Tên trò chơi",
  objectives: "Mục tiêu bài học",
  preparation: "Chuẩn bị đồ dùng",
  procedure: "Cách chơi (các bước theo thứ tự)",
  teacherScript: "Lời dẫn của cô",
  safetyWarnings: "Cảnh báo an toàn",
};

export function composeSectionRewritePrompt(args: {
  section: EditableSection;
  plan: LessonPlanOutput;
  instruction?: string;
  materials: string[];
  ageGroup: string;
  duration: number;
  revision?: Revision<unknown>;
}): string {
  const { section, plan } = args;
  const others = Object.fromEntries(Object.entries(plan).filter(([k]) => k !== section));
  return composePrompt([
    [null, systemIdentity],
    [null, languageRules],
    [null, UNTRUSTED_RULE],
    [
      "NHIỆM VỤ",
      `Viết lại DUY NHẤT phần "${SECTION_LABELS[section]}" của giáo án "${plan.gameName}" cho trẻ ${getAgeLabel(args.ageGroup)}, thời lượng ${args.duration} phút. Trả về giá trị mới của phần đó (trường "value"); các phần khác giữ nguyên nên phần mới phải ăn khớp với chúng.`,
    ],
    ["GÓP Ý CỦA CÔ", args.instruction ? fenceUntrusted("góp ý của cô", args.instruction) : "Cô không nêu góp ý cụ thể: hãy làm phần này tốt hơn theo các tiêu chí đánh giá."],
    ["HỌC LIỆU CÔ CÓ SẴN", args.materials.join(", ")],
    ["NỘI DUNG HIỆN TẠI CỦA PHẦN NÀY", JSON.stringify(plan[section], null, 2)],
    ["CÁC PHẦN CÒN LẠI CỦA GIÁO ÁN (chỉ để tham chiếu)", JSON.stringify(others, null, 2)],
    ["TIÊU CHÍ ĐÁNH GIÁ (chấm trên toàn bộ giáo án sau khi ghép phần mới)", formatCriteria(sectionRewriteRubric)],
    revisionSection(args.revision),
  ]);
}
