import type { LessonPlanOutput } from "../schemas/lesson-plan.schema";
import { sanitizeDeep } from "./language-guard";
import { verifyCitation } from "./legal-citation";

export type RuleId = "BR-001" | "BR-002" | "BR-003" | "BR-004" | "BR-005";
export interface Violation {
  rule: RuleId;
  message: string;
}

/**
 * Lưới an toàn cuối cùng, chạy SAU vòng tiêu chí đánh giá của AI (src/ai/quality). Chỉ làm hai việc mang tính sự thật/pháp lý,
 * không soạn nội dung thay AI:
 *  - BR-004: từ ngữ chẩn đoán/dán nhãn trẻ còn sót thì thay bằng cụm trung lập (đầu ra có thể tới tay phụ huynh).
 *  - BR-003: cờ "đã xác minh" của căn cứ pháp lý được đặt lại theo kho tri thức (AI không tự khẳng định được).
 */
export function finalizePlanOutput(raw: LessonPlanOutput): { plan: LessonPlanOutput; corrections: Violation[] } {
  const corrections: Violation[] = [];
  const lang = sanitizeDeep(raw);
  lang.violations.forEach((message) => corrections.push({ rule: "BR-004", message: `Đã thay từ ngữ: ${message}` }));

  const citation = verifyCitation(lang.value.legalReference);
  if (lang.value.legalReference.isVerified && !citation.isVerified) {
    corrections.push({ rule: "BR-003", message: `Không tìm thấy số hiệu "${lang.value.legalReference.documentCode}" trong kho tri thức` });
  }
  return { plan: { ...lang.value, legalReference: citation.reference }, corrections };
}

export * from "./language-guard";
export * from "./legal-citation";
export * from "./safety-guard";
export * from "./screen-free-guard";
export * from "./permission-guard";
