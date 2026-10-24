import type { UIMessage } from "ai";
import type { PlanRecord } from "@/data/repositories";
import type { FeedbackStats } from "@/services/types";
import type { ParentCardContent } from "@/core/schemas/parent-card.schema";
import type { HomeActivity } from "@/core/schemas/family.schema";
import type { AreaProgress } from "@/services/family/child-profile.service";
import type { GenerationStep } from "@/ai/engine";

/** Date -> string (dữ liệu đi qua JSON giữa server và client) */
export type Jsonify<T> = T extends Date ? string : T extends (infer U)[] ? Jsonify<U>[] : T extends object ? { [K in keyof T]: Jsonify<T[K]> } : T;

export type PlanDTO = Jsonify<PlanRecord>;

export interface AlertDTO {
  id: string;
  studentId: string;
  studentName: string;
  pattern: string;
  weekCount: number;
  skillArea: string;
  suggestedActivity: string;
  disclaimer: string;
}

export interface PlanSummaryDTO {
  id: string;
  gameName: string | null;
  status: PlanRecord["status"];
  topic: string;
  createdAt: string;
}

export interface KnowledgeItem {
  title: string;
  documentCode: string;
  content: string;
  level?: "critical" | "warning" | "info";
}

/** Thẻ kết quả hiển thị trong khung chat (do công cụ của agent trả về qua artifact) */
export type CardData =
  /** awaiting: agent đã chuẩn bị, chờ cô bấm xác nhận trên thẻ (agent không tự phê duyệt/gửi) */
  | { kind: "plan"; planId: string; plan: PlanDTO; violations: string[]; awaiting?: "approve" }
  | { kind: "checklist"; planId: string; gameName: string; checklistId: string; criteria: string[] }
  | { kind: "parent-card"; cardId: string; planId: string; status: string; content: ParentCardContent; awaiting?: "send" }
  | { kind: "feedback-stats"; cardId: string; stats: FeedbackStats; links: { studentName: string; url: string }[] }
  | { kind: "alerts"; alerts: AlertDTO[] }
  | { kind: "plan-list"; plans: PlanSummaryDTO[] }
  | { kind: "knowledge"; tool: string; title: string; items: KnowledgeItem[] }
  | { kind: "home-activity"; studentId: string; activity: HomeActivity }
  | { kind: "child-progress"; progress: AreaProgress[] }
  | { kind: "child-lessons"; lessons: { planId: string; gameName: string; areaLabel: string; date: string; summary: string; missionTitle: string | null }[] }
  | { kind: "notice"; tone: "warning" | "info"; message: string };

export type CardPayload = CardData & { tool?: string };

export type StatusData =
  | { type: "step"; step: GenerationStep }
  | { type: "tool"; name: string }
  | { type: "done" };

export interface NoticeData {
  code: "ERR-NET-01";
  message: string;
}

export type StuGuideMessage = UIMessage<never, { card: CardPayload; status: StatusData; notice: NoticeData }>;
