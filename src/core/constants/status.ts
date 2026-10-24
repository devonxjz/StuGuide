export const PLAN_STATUSES = ["ai_draft", "needs_review", "approved", "shared"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_STATUS_META: Record<PlanStatus, { label: string; tone: "neutral" | "warning" | "success" | "info" }> = {
  ai_draft: { label: "Bản nháp AI", tone: "neutral" },
  needs_review: { label: "Cần rà soát", tone: "warning" },
  approved: { label: "Đã duyệt", tone: "success" },
  shared: { label: "Đã chia sẻ", tone: "info" },
};

export const ASSESSMENT_RATINGS = ["excellent", "achieved", "needs_practice"] as const;
export type AssessmentRating = (typeof ASSESSMENT_RATINGS)[number];

export const RATING_META: Record<AssessmentRating, { label: string; emoji: string }> = {
  excellent: { label: "Tốt", emoji: "🌟" },
  achieved: { label: "Đã đạt", emoji: "✅" },
  needs_practice: { label: "Cần rèn thêm", emoji: "🌱" },
};

export const FEEDBACK_RESPONSES = ["completed", "needs_practice"] as const;
export type FeedbackResponse = (typeof FEEDBACK_RESPONSES)[number];

export const ROLES = ["teacher", "principal", "parent"] as const;
export type Role = (typeof ROLES)[number];

/** Số tuần liên tiếp "cần rèn thêm" để sinh Gợi ý quan sát sâu (spec 1.2) */
export const ALERT_WEEK_THRESHOLD = 3;
