import type { ServiceDeps } from "./types";
import { createAuditService } from "./audit.service";
import { createLessonPlannerService } from "./lesson-planner.service";
import { createAssessmentService } from "./assessment.service";
import { createParentCardService } from "./parent-card.service";
import { createFeedbackService } from "./feedback.service";
import { createReportService } from "./report.service";
import { createClassService } from "./class.service";
import { createParentEmailService } from "./parent-email.service";

/** Composition root của tầng Application. */
export function createServices(deps: ServiceDeps) {
  const audit = createAuditService(deps.repos);
  const lessonPlanner = createLessonPlannerService(deps, audit);
  const assessment = createAssessmentService(deps, audit, lessonPlanner);
  const parentCards = createParentCardService(deps, audit, lessonPlanner);
  const feedback = createFeedbackService(deps, audit, parentCards);
  const reports = createReportService(deps, audit);
  const parentEmails = createParentEmailService(deps, audit, lessonPlanner);
  const classes = createClassService(deps, audit);
  return { audit, classes, lessonPlanner, assessment, parentCards, feedback, reports, parentEmails };
}

export type Services = ReturnType<typeof createServices>;
export type { Actor, FeedbackStats, FeedbackEvents, Mailer, ServiceDeps } from "./types";
