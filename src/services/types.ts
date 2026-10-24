import type { Repositories } from "@/data/repositories";
import type { AiEngine } from "@/ai/engine";
import type { Role } from "@/core/constants/status";

/** Người đang thao tác (đã xác thực ở tầng trình bày). */
export interface Actor {
  id: string;
  role: Role;
  /** Lớp đang phụ trách (giáo viên) */
  classId?: string;
  /** Trường của tài khoản: ranh giới dữ liệu của BGH (thiếu thì mọi kiểm tra theo trường đều từ chối) */
  schoolId?: string;
}

export interface FeedbackStats {
  total: number;
  completed: number;
  needsPractice: number;
  pending: number;
  /** % phụ huynh đã bấm "Bé đã hoàn thành" trên tổng số bé (làm tròn) */
  completionRate: number;
  completedStudents: string[];
  needsSupportStudents: string[];
  pendingStudents: string[];
}

/** Cổng phát sự kiện realtime (SSE trong prototype; Supabase Realtime khi lên production). */
export interface FeedbackEvents {
  publishFeedback(cardId: string, stats: FeedbackStats): void;
}

export interface ServiceDeps {
  repos: Repositories;
  engine: AiEngine;
  events: FeedbackEvents;
}
