import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AiEngine } from "@/ai/engine";
import type { Repositories } from "@/data/repositories";
import { createChildProfileService } from "./child-profile.service";
import { createLearningSessionService, type DistillFn } from "./learning-session.service";
import { createFamilyAssistantService } from "./family-assistant.service";

/** Cổng phụ huynh: hồ sơ cá nhân hóa từng bé, phiên học ở nhà (RAM → DB) và trợ lý gia đình. */
export function createFamilyServices(deps: {
  repos: Repositories;
  engine: AiEngine;
  audit: { log: (e: { userId?: string | null; action: string; target?: string; details?: string }) => unknown };
  distiller: DistillFn;
  getModel: () => BaseChatModel;
}) {
  const profiles = createChildProfileService({ repos: deps.repos, audit: deps.audit });
  const sessions = createLearningSessionService({ repos: deps.repos, profiles, distiller: deps.distiller });
  const assistant = createFamilyAssistantService({ repos: deps.repos, profiles, engine: deps.engine, getModel: deps.getModel });
  return { profiles, sessions, assistant };
}
export type FamilyServices = ReturnType<typeof createFamilyServices>;
