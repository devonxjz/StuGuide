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

  it("P1-06: nam châm và pin cúc áo luôn bắt buộc mức critical ở mọi độ tuổi", () => {
    for (const age of ["24-36m", "3-4y", "5-6y"]) {
      expect(requiredSafetyCoverage(["Nam châm"], age)).toEqual([expect.objectContaining({ hazard: "magnet", minLevel: "critical" })]);
      expect(requiredSafetyCoverage(["Pin cúc áo"], age)).toEqual(expect.arrayContaining([expect.objectContaining({ hazard: "button-battery", minLevel: "critical" })]));
    }
  });

  it("P1-06: bóng bay và dây dài: critical với trẻ 24–36 tháng, warning với trẻ lớn hơn", () => {
    expect(requiredSafetyCoverage(["Bóng bay"], "24-36m")).toEqual([expect.objectContaining({ hazard: "balloon", minLevel: "critical" })]);
    expect(requiredSafetyCoverage(["Bóng bay"], "5-6y")).toEqual([expect.objectContaining({ hazard: "balloon", minLevel: "warning" })]);
    expect(requiredSafetyCoverage(["Dây ruy băng"], "24-36m")).toEqual([expect.objectContaining({ hazard: "long-cord", minLevel: "critical" })]);
    expect(requiredSafetyCoverage(["Dây ruy băng"], "5-6y")).toEqual([expect.objectContaining({ hazard: "long-cord", minLevel: "warning" })]);
  });

  it("P1-06: hạt nở: critical dưới 4 tuổi, warning với trẻ lớn hơn", () => {
    expect(requiredSafetyCoverage(["Hạt nở"], "24-36m")).toEqual(expect.arrayContaining([expect.objectContaining({ hazard: "expanding-bead", minLevel: "critical" })]));
    expect(requiredSafetyCoverage(["Hạt nở"], "5-6y")).toEqual(expect.arrayContaining([expect.objectContaining({ hazard: "expanding-bead", minLevel: "warning" })]));
  });

  it("P1-06: dị ứng và vật nóng luôn bắt buộc mức warning", () => {
    expect(requiredSafetyCoverage(["Đậu phộng"], "5-6y")).toEqual([expect.objectContaining({ hazard: "allergen", minLevel: "warning" })]);
    expect(requiredSafetyCoverage(["Găng tay cao su"], "4-5y")).toEqual([expect.objectContaining({ hazard: "allergen", minLevel: "warning" })]);
    expect(requiredSafetyCoverage(["Nước nóng"], "5-6y")).toEqual([expect.objectContaining({ hazard: "hot-surface", minLevel: "warning" })]);
  });

  it("P1-06: thiếu cảnh báo cho nhóm nguy cơ mới thì bị flagged; cảnh báo nhắc đúng vật liệu thì đạt", () => {
    expect(checkSafetyCoverage([], ["Nam châm"], "5-6y")).toEqual(expect.arrayContaining([expect.stringMatching(/Nam châm/)]) );
    expect(checkSafetyCoverage([w("critical", "Nam châm", "không dùng nam châm nhỏ")], ["Nam châm"], "5-6y")).toEqual([]);
    expect(checkSafetyCoverage([w("warning", "Bóng bay", "người lớn thổi và thu mảnh vỡ")], ["Bóng bay"], "5-6y")).toEqual([]);
  });
});
