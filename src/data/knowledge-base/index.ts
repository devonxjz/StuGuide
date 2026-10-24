import type { KnowledgeRecord } from "@/core/entities";
import { VBHN01_CHUNKS } from "./vbhn01";
import { TT45_CHUNKS } from "./tt45-safety";
import { FOLKLORE_CHUNKS } from "./folklore";
import { STEM_CHUNKS } from "./stem";

export const KNOWLEDGE_BASE: KnowledgeRecord[] = [...VBHN01_CHUNKS, ...TT45_CHUNKS, ...FOLKLORE_CHUNKS, ...STEM_CHUNKS];
