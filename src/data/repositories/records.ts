import type { LessonPlan } from "@/generated/prisma/client";
import type { Flashcard, LegalReference, ProcedureStep, SafetyWarning } from "@/core/schemas/lesson-plan.schema";
import type { PlanStatus } from "@/core/constants/status";
import type { Violation } from "@/core/guardrails";

/** LessonPlan đã giải mã các cột Json thành kiểu miền. */
export interface PlanRecord {
  id: string;
  classId: string;
  teacherId: string;
  status: PlanStatus;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  approvedBy: string | null;
  ageGroup: string;
  developmentArea: string;
  stemEnabled: boolean;
  folkGameEnabled: boolean;
  topic: string;
  duration: number;
  space: string;
  materials: string[];
  classNotes: string | null;
  gameName: string | null;
  legalReference: LegalReference | null;
  safetyWarnings: SafetyWarning[];
  objectives: string[];
  preparation: string[];
  procedure: ProcedureStep[];
  teacherScript: string | null;
  flashcards: Flashcard[];
  observationCriteria: string[];
  eqQuestions: string[];
  guardViolations: Violation[];
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Cột flashcardPrompts: bản mới là {text, emoji}; dữ liệu cũ là chuỗi thuần (không có emoji). */
const toFlashcards = (v: unknown): Flashcard[] =>
  arr<unknown>(v).flatMap((f) => {
    if (typeof f === "string") return f.trim() ? [{ text: f, emoji: "" }] : [];
    if (f && typeof f === "object" && typeof (f as Flashcard).text === "string") return [{ text: (f as Flashcard).text, emoji: String((f as Flashcard).emoji ?? "") }];
    return [];
  });

export function toPlanRecord(row: LessonPlan): PlanRecord {
  const { flashcardPrompts, ...rest } = row;
  return {
    ...rest,
    status: row.status as PlanStatus,
    materials: arr<string>(row.materials),
    legalReference: (row.legalReference as LegalReference | null) ?? null,
    safetyWarnings: arr<SafetyWarning>(row.safetyWarnings),
    objectives: arr<string>(row.objectives),
    preparation: arr<string>(row.preparation),
    procedure: arr<ProcedureStep>(row.procedure),
    flashcards: toFlashcards(flashcardPrompts),
    observationCriteria: arr<string>(row.observationCriteria),
    eqQuestions: arr<string>(row.eqQuestions),
    guardViolations: arr<Violation>(row.guardViolations),
  };
}
