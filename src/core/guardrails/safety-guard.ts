import type { SafetyWarning } from "../schemas/lesson-plan.schema";
import type { AgeGroup } from "../constants/age-groups";

/**
 * BR-002 (Thông tư 45/2021/TT-BGDĐT): từ vật liệu + độ tuổi suy ra những rủi ro BẮT BUỘC phải được cảnh báo.
 * Module này chỉ PHÁT HIỆN yêu cầu và KIỂM TRA đầu ra; nội dung cảnh báo do AI tự viết theo kho tri thức.
 */
export const RULE_REF = "45/2021/TT-BGDĐT";

export type Hazard = "small-object" | "sharp-edge";
type Level = SafetyWarning["level"];

export interface SafetyRequirement {
  material: string;
  hazard: Hazard;
  /** Từ khóa vật liệu đã khớp (dùng để đối chiếu cảnh báo) */
  keyword: string;
  minLevel: Exclude<Level, "info">;
  reason: string;
}

const SMALL_OBJECT = /(hạt nhựa|hạt|bóng nhựa nhỏ|bóng nhỏ|sỏi|cúc áo|cúc|viên|nút|đá nhỏ|nắp chai)/i;
const SHARP_EDGE = /(vỏ hộp|hộp|lon|vỏ chai|chai|kéo|que)/i;
const RANK: Record<Level, number> = { info: 0, warning: 1, critical: 2 };

const fold = (s: string) => s.normalize("NFC").toLowerCase();

export function requiredSafetyCoverage(materials: string[], ageGroup: AgeGroup | string): SafetyRequirement[] {
  const youngest = ageGroup === "24-36m";
  const underFour = youngest || ageGroup === "3-4y";
  const out: SafetyRequirement[] = [];
  for (const material of materials) {
    const small = material.match(SMALL_OBJECT);
    if (small && underFour) {
      out.push({
        material,
        hazard: "small-object",
        keyword: small[0],
        minLevel: youngest ? "critical" : "warning",
        reason: youngest ? "Vật nhỏ: nguy cơ hóc/nuốt với trẻ 24–36 tháng (cấm dùng hoặc thay vật lớn hơn)" : "Vật nhỏ: nguy cơ hóc với trẻ 3–4 tuổi (giám sát, kiểm đếm)",
      });
    }
    const sharp = material.match(SHARP_EDGE);
    if (sharp) out.push({ material, hazard: "sharp-edge", keyword: sharp[0], minLevel: "warning", reason: "Đồ tái chế/dụng cụ có thể có mép sắc nhọn" });
  }
  return out;
}

/** Trả về danh sách vấn đề: mỗi rủi ro bắt buộc phải có một cảnh báo nhắc tới vật liệu đó với mức đủ nghiêm trọng. */
export function checkSafetyCoverage(warnings: SafetyWarning[], materials: string[], ageGroup: AgeGroup | string): string[] {
  const issues: string[] = [];
  if (warnings.length === 0) issues.push("Chưa có cảnh báo an toàn nào");
  for (const req of requiredSafetyCoverage(materials, ageGroup)) {
    const covered = warnings.some((w) => {
      const text = fold(`${w.material} ${w.description}`);
      return RANK[w.level] >= RANK[req.minLevel] && (text.includes(fold(req.keyword)) || text.includes(fold(req.material)));
    });
    if (!covered) issues.push(`Thiếu cảnh báo mức "${req.minLevel}" cho "${req.material}": ${req.reason}`);
  }
  return issues;
}
