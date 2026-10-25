import type { SafetyWarning } from "../schemas/lesson-plan.schema";
import type { AgeGroup } from "../constants/age-groups";

/**
 * BR-002 (Thông tư 45/2021/TT-BGDĐT): từ vật liệu + độ tuổi suy ra những rủi ro BẮT BUỘC phải được cảnh báo.
 * Module này chỉ PHÁT HIỆN yêu cầu và KIỂM TRA đầu ra; nội dung cảnh báo do AI tự viết theo kho tri thức.
 */
export const RULE_REF = "45/2021/TT-BGDĐT";

export type Hazard = "small-object" | "sharp-edge" | "magnet" | "button-battery" | "balloon" | "long-cord" | "expanding-bead" | "allergen" | "hot-surface";
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

type AgeBand = "youngest" | "underFour" | "older";
const ageBand = (ageGroup: AgeGroup | string): AgeBand => (ageGroup === "24-36m" ? "youngest" : ageGroup === "3-4y" ? "underFour" : "older");

interface HazardRule {
  hazard: Hazard;
  pattern: RegExp;
  /** Mức tối thiểu theo nhóm tuổi; null nghĩa là không bắt buộc với nhóm tuổi đó. */
  level: (band: AgeBand) => Exclude<Level, "info"> | null;
  reason: string;
}

const HAZARD_RULES: HazardRule[] = [
  {
    hazard: "small-object",
    pattern: SMALL_OBJECT,
    level: (band) => (band === "youngest" ? "critical" : band === "underFour" ? "warning" : null),
    reason: "Vật nhỏ: nguy cơ hóc/nuốt",
  },
  {
    hazard: "sharp-edge",
    pattern: SHARP_EDGE,
    level: () => "warning",
    reason: "Đồ tái chế/dụng cụ có thể có mép sắc nhọn",
  },
  {
    hazard: "magnet",
    pattern: /(nam châm|magnet)/i,
    level: () => "critical",
    reason: "Nam châm: nuốt nhiều viên có thể kẹp ruột, nguy hiểm tính mạng — cấm dùng với trẻ mầm non hoặc chỉ dùng loại lớn, cố định, có người lớn giám sát chặt",
  },
  {
    hazard: "button-battery",
    pattern: /(pin cúc áo|pin cúc|pin đồng xu)/i,
    level: () => "critical",
    reason: "Pin cúc áo: nuốt phải có thể gây bỏng hóa học thực quản trong vài giờ — khoang pin phải khóa chặt, kiểm đếm trước và sau buổi học",
  },
  {
    hazard: "balloon",
    pattern: /(bóng bay|bong bóng)/i,
    level: (band) => (band === "youngest" ? "critical" : "warning"),
    reason: "Bóng bay: mảnh bóng vỡ có thể gây hóc — thổi và buộc bởi người lớn, thu gom mảnh vỡ ngay, trẻ nhỏ không tự thổi",
  },
  {
    hazard: "long-cord",
    pattern: /(dây dài|dây thừng|ruy băng|sợi dây)/i,
    level: (band) => (band === "youngest" ? "critical" : "warning"),
    reason: "Dây/ruy băng dài: nguy cơ siết cổ — dùng dây ngắn, không quàng qua cổ, người lớn giám sát",
  },
  {
    hazard: "expanding-bead",
    pattern: /(hạt nở|hạt nước|hạt trương nở|water bead)/i,
    level: (band) => (band === "older" ? "warning" : "critical"),
    reason: "Hạt nở: nở to trong cơ thể nếu nuốt phải, khó phát hiện — trẻ nhỏ không dùng, trẻ lớn dùng phải có người lớn giám sát và kiểm đếm",
  },
  {
    hazard: "allergen",
    pattern: /(đậu phộng|đậu nành|hạt điều|latex|bột mì|gluten|găng tay cao su)/i,
    level: () => "warning",
    reason: "Vật liệu có thể gây dị ứng — hỏi trước tiền sử dị ứng của trẻ, chuẩn bị vật thay thế",
  },
  {
    hazard: "hot-surface",
    pattern: /(nước nóng|bàn là|bếp nóng|chảo nóng|nến|diêm)/i,
    level: () => "warning",
    reason: "Vật nóng/lửa: nguy cơ bỏng — chỉ người lớn thao tác, trẻ đứng ngoài vùng nóng",
  },
];

export function requiredSafetyCoverage(materials: string[], ageGroup: AgeGroup | string): SafetyRequirement[] {
  const band = ageBand(ageGroup);
  const out: SafetyRequirement[] = [];
  for (const material of materials) {
    for (const rule of HAZARD_RULES) {
      const match = material.match(rule.pattern);
      const minLevel = match ? rule.level(band) : null;
      if (!match || !minLevel) continue;
      // Giữ nguyên diễn đạt cũ cho 2 nhóm nguy cơ gốc để không đổi hành vi đã có.
      const reason =
        rule.hazard === "small-object"
          ? band === "youngest"
            ? "Vật nhỏ: nguy cơ hóc/nuốt với trẻ 24–36 tháng (cấm dùng hoặc thay vật lớn hơn)"
            : "Vật nhỏ: nguy cơ hóc với trẻ 3–4 tuổi (giám sát, kiểm đếm)"
          : rule.reason;
      out.push({ material, hazard: rule.hazard, keyword: match[0], minLevel, reason });
    }
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
