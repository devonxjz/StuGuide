import type { LegalReference } from "../schemas/lesson-plan.schema";

/** BR-003: chỉ chấp nhận số hiệu có trong kho tri thức đã kiểm định. */
export const KNOWN_DOCUMENT_CODES = [
  "VBHN 01/VBHN-BGDĐT",
  "45/2021/TT-BGDĐT",
  "13/2023/NĐ-CP",
  "102/2016/QH13",
] as const;

const normalize = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim().toUpperCase();

export interface CitationResult {
  isVerified: boolean;
  reference: LegalReference;
}

export function verifyCitation(
  reference: LegalReference,
  knownCodes: readonly string[] = KNOWN_DOCUMENT_CODES,
): CitationResult {
  const code = normalize(reference.documentCode);
  const found = knownCodes.some((k) => code.includes(normalize(k)));
  return { isVerified: found, reference: { ...reference, isVerified: found } };
}
