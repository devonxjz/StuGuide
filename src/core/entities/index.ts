export type { LessonPlanOutput, LegalReference, SafetyWarning, ProcedureStep } from "../schemas/lesson-plan.schema";
export type { ParentCardContent } from "../schemas/parent-card.schema";
export type { CreatePlanInput } from "../schemas/form-inputs.schema";
export type { AssessmentEntry, BehaviorAnalysisOutput } from "../schemas/assessment.schema";
export type { PlanStatus, AssessmentRating, FeedbackResponse, Role } from "../constants/status";

export type KnowledgeCollection = "vbhn01" | "tt45-safety" | "folklore" | "stem";

export interface KnowledgeMetadata {
  collection: KnowledgeCollection;
  documentCode: string;
  section: string;
  title?: string;
  ageGroup?: string;
  developmentArea?: string;
  level?: "critical" | "warning" | "info";
  ageRestriction?: string;
  /** Nội dung là tóm lược minh họa cho prototype, cần đối chiếu văn bản gốc trước khi dùng thật */
  isSummary: true;
}

export interface KnowledgeRecord {
  id: string;
  content: string;
  metadata: KnowledgeMetadata;
}
