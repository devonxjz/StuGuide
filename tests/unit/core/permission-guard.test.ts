import { describe, it, expect } from "vitest";
import { can, assertParentOwnsStudent, PermissionError } from "@/core/guardrails/permission-guard";

describe("PermissionGuard (BR-006 + RBAC)", () => {
  it("giáo viên soạn được giáo án, phụ huynh thì không", () => {
    expect(can("teacher", "plan:write")).toBe(true);
    expect(can("parent", "plan:write")).toBe(false);
  });

  it("chỉ BGH xuất báo cáo và xem audit log", () => {
    expect(can("principal", "report:export")).toBe(true);
    expect(can("teacher", "report:export")).toBe(false);
    expect(can("parent", "audit:read")).toBe(false);
    expect(can("principal", "audit:read")).toBe(true);
  });

  it("BGH chỉ xem, không sửa đánh giá", () => {
    expect(can("principal", "assessment:read")).toBe(true);
    expect(can("principal", "assessment:write")).toBe(false);
  });

  it("phụ huynh chỉ gửi phản hồi cho con mình", () => {
    expect(can("parent", "feedback:write")).toBe(true);
    expect(() => assertParentOwnsStudent(["s1"], "s1")).not.toThrow();
    expect(() => assertParentOwnsStudent(["s1"], "s2")).toThrow(PermissionError);
  });
});
