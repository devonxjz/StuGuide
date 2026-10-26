import type { Db } from "../prisma";
import { createLessonPlanRepo } from "./lesson-plan.repo";
import { createStudentRepo } from "./student.repo";
import { createUserRepo } from "./user.repo";
import { createAssessmentRepo } from "./assessment.repo";
import { createParentCardRepo } from "./parent-card.repo";
import { createAuditLogRepo } from "./audit-log.repo";
import { createConversationRepo, createMemoryRepo } from "./conversation.repo";
import { createChildRepo } from "./child.repo";
import { createAiQuotaRepo } from "./ai-quota.repo";

export function createRepositories(db: Db) {
  return {
    lessonPlans: createLessonPlanRepo(db),
    students: createStudentRepo(db),
    users: createUserRepo(db),
    assessments: createAssessmentRepo(db),
    parentCards: createParentCardRepo(db),
    audit: createAuditLogRepo(db),
    conversations: createConversationRepo(db),
    memories: createMemoryRepo(db),
    children: createChildRepo(db),
    aiQuota: createAiQuotaRepo(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
export type { PlanRecord } from "./records";
