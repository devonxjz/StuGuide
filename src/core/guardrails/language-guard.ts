/** BR-004: cấm chẩn đoán / dán nhãn trẻ. Thay bằng cụm từ trung lập theo spec. */
export const NEUTRAL_PHRASE = "Cần quan tâm rèn luyện thêm";

export const BANNED_TERMS = [
  "tự kỷ",
  "tăng động",
  "chậm phát triển",
  "yếu kém",
  "bệnh lý",
  "rối loạn",
  "khuyết tật",
  "thiểu năng",
  "đần độn",
  "ngu ngốc",
  "kém cỏi",
] as const;

export interface GuardResult {
  passed: boolean;
  violations: string[];
  sanitized?: string;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function checkLanguage(text: string): GuardResult {
  const normalized = text.normalize("NFC");
  const violations: string[] = [];
  let sanitized = normalized;

  for (const term of BANNED_TERMS) {
    const re = new RegExp(escapeRegExp(term), "gi");
    if (re.test(sanitized)) {
      violations.push(`Chứa từ ngữ cấm: "${term}"`);
      sanitized = sanitized.replace(new RegExp(escapeRegExp(term), "gi"), NEUTRAL_PHRASE);
    }
  }

  return { passed: violations.length === 0, violations, sanitized: violations.length ? sanitized : undefined };
}

/** Làm sạch mọi chuỗi bên trong object/array (dùng cho output có cấu trúc của AI). */
export function sanitizeDeep<T>(input: T): { value: T; violations: string[] } {
  const violations: string[] = [];
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") {
      const r = checkLanguage(node);
      violations.push(...r.violations);
      return r.sanitized ?? node;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v)]));
    }
    return node;
  };
  return { value: walk(input) as T, violations };
}
