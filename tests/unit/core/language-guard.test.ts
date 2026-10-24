import { describe, it, expect } from "vitest";
import { checkLanguage, NEUTRAL_PHRASE } from "@/core/guardrails/language-guard";

describe("LanguageGuard (BR-004)", () => {
  it("chặn từ ngữ chẩn đoán", () => {
    const r = checkLanguage("Bé có biểu hiện tự kỷ nhẹ");
    expect(r.passed).toBe(false);
    expect(r.violations).toContain('Chứa từ ngữ cấm: "tự kỷ"');
  });

  it("thay bằng cụm từ trung lập theo spec", () => {
    const r = checkLanguage("Trẻ tăng động cần được theo dõi");
    expect(r.sanitized).toBe(`Trẻ ${NEUTRAL_PHRASE} cần được theo dõi`);
    expect(NEUTRAL_PHRASE).toBe("Cần quan tâm rèn luyện thêm");
  });

  it("không phân biệt hoa thường", () => {
    expect(checkLanguage("Bé CHẬM PHÁT TRIỂN").passed).toBe(false);
  });

  it("cho phép mô tả hành vi khách quan", () => {
    const r = checkLanguage("Bé có biểu hiện ngại giao tiếp nhóm trong 3 tuần liên tiếp");
    expect(r.passed).toBe(true);
    expect(r.sanitized).toBeUndefined();
  });

  it("làm sạch đệ quy mọi chuỗi trong object", async () => {
    const { sanitizeDeep } = await import("@/core/guardrails/language-guard");
    const { value, violations } = sanitizeDeep({ a: ["bé yếu kém"], b: { c: "ok" } });
    expect(violations.length).toBe(1);
    expect(JSON.stringify(value)).not.toContain("yếu kém");
    expect(value.b.c).toBe("ok");
  });
});
