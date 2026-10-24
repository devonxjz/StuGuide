import { describe, it, expect } from "vitest";
import { checkSafetyCoverage, requiredSafetyCoverage } from "@/core/guardrails/safety-guard";
import type { SafetyWarning } from "@/core/schemas/lesson-plan.schema";

const w = (level: SafetyWarning["level"], material: string, description = "Cô giám sát") => ({ level, material, description, ruleRef: "45/2021/TT-BGDĐT" });

describe("SafetyGuard (BR-002): phát hiện rủi ro bắt buộc, KHÔNG tự chèn nội dung", () => {
  it("24–36 tháng + vật nhỏ => bắt buộc mức critical; 3–4 tuổi => warning; 4–5 tuổi => không bắt buộc", () => {
    expect(requiredSafetyCoverage(["Hạt nhựa"], "24-36m")).toEqual([expect.objectContaining({ hazard: "small-object", minLevel: "critical" })]);
    expect(requiredSafetyCoverage(["Hạt nhựa"], "3-4y")).toEqual([expect.objectContaining({ minLevel: "warning" })]);
    expect(requiredSafetyCoverage(["Hạt nhựa"], "4-5y")).toEqual([]);
  });

  it("đồ tái chế/dụng cụ có mép sắc => bắt buộc cảnh báo ở mọi độ tuổi", () => {
    expect(requiredSafetyCoverage(["Vỏ hộp sữa tái chế"], "5-6y")).toEqual([expect.objectContaining({ hazard: "sharp-edge", minLevel: "warning" })]);
  });

  it("vật liệu an toàn => không có yêu cầu bắt buộc nào", () => {
    expect(requiredSafetyCoverage(["Giấy màu", "Khăn voan"], "24-36m")).toEqual([]);
  });

  it("không có cảnh báo nào => vi phạm", () => {
    expect(checkSafetyCoverage([], ["Giấy màu"], "5-6y")).toEqual(["Chưa có cảnh báo an toàn nào"]);
  });

  it("cảnh báo nhắc đúng vật liệu, đủ mức => đạt (không phân biệt hoa thường, khớp theo từ khóa vật liệu)", () => {
    expect(checkSafetyCoverage([w("critical", "HẠT NHỰA màu")], ["Hạt nhựa"], "24-36m")).toEqual([]);
    expect(checkSafetyCoverage([w("warning", "Vỏ hộp", "kiểm tra mép")], ["Vỏ hộp sữa tái chế"], "4-5y")).toEqual([]);
  });

  it("mức thấp hơn yêu cầu hoặc không nhắc tới vật liệu => vi phạm, nêu rõ vật liệu", () => {
    const tooLow = checkSafetyCoverage([w("warning", "Hạt nhựa")], ["Hạt nhựa"], "24-36m");
    expect(tooLow).toHaveLength(1);
    expect(tooLow[0]).toMatch(/critical.*Hạt nhựa/);
    expect(checkSafetyCoverage([w("critical", "Rổ")], ["Hạt nhựa"], "24-36m")).toHaveLength(1);
  });

  it("cảnh báo critical đáp ứng cả yêu cầu mức warning", () => {
    expect(checkSafetyCoverage([w("critical", "Hạt nhựa")], ["Hạt nhựa"], "3-4y")).toEqual([]);
  });
});
