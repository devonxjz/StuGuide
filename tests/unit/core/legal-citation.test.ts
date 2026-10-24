import { describe, it, expect } from "vitest";
import { verifyCitation, KNOWN_DOCUMENT_CODES } from "@/core/guardrails/legal-citation";

describe("LegalCitation (BR-003)", () => {
  it("chấp nhận mã văn bản có trong kho tri thức", () => {
    const r = verifyCitation({ documentCode: "VBHN 01/VBHN-BGDĐT", relevantSection: "x", summary: "y", isVerified: true });
    expect(r.isVerified).toBe(true);
  });

  it("chuẩn hóa khoảng trắng/hoa thường", () => {
    const r = verifyCitation({ documentCode: " vbhn 01/vbhn-bgdđt ", relevantSection: "x", summary: "y", isVerified: true });
    expect(r.isVerified).toBe(true);
  });

  it("hạ cờ isVerified khi AI bịa số hiệu", () => {
    const r = verifyCitation({ documentCode: "TT 99/2030/TT-BGDĐT", relevantSection: "x", summary: "y", isVerified: true });
    expect(r.isVerified).toBe(false);
    expect(r.reference.isVerified).toBe(false);
  });

  it("kho tri thức có đủ văn bản chính", () => {
    expect(KNOWN_DOCUMENT_CODES).toContain("VBHN 01/VBHN-BGDĐT");
    expect(KNOWN_DOCUMENT_CODES).toContain("45/2021/TT-BGDĐT");
  });
});
