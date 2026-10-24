import type { ServiceDeps } from "./types";
import { createAuditService } from "./audit.service";
import { createLessonPlannerService } from "./lesson-planner.service";
import { createAssessmentService } from "./assessment.service";
import { createParentCardService } from "./parent-card.service";
import { createFeedbackService } from "./feedback.service";
import { createReportService } from "./report.service";

/** Composition root của tầng Application. */
export function createServices(deps: ServiceDeps) {
  const audit = createAuditService(deps.repos);
  const lessonPlanner = createLessonPlannerService(deps, audit);
  const assessment = createAssessmentService(deps, audit, lessonPlanner);
  const parentCards = createParentCardService(deps, audit, lessonPlanner);
  const feedback = createFeedbackService(deps, audit, parentCards);
  const reports = createReportService(deps, audit);
  return { audit, lessonPlanner, assessment, parentCards, feedback, reports };
}

export type Services = ReturnType<typeof createServices>;
export type { Actor, FeedbackStats, FeedbackEvents, ServiceDeps } from "./types";
