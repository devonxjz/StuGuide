// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanCard } from "@/components/teacher/chat/cards/plan-card";
import { usePlanStore } from "@/stores/plan.store";
import { sampleLessonPlan } from "../fixtures/lesson-plan";
import type { PlanDTO } from "@/types/chat";

const plan = {
  id: "p1",
  classId: "c1",
  teacherId: "t1",
  status: "ai_draft",
  createdAt: "2026-10-24T01:00:00.000Z",
  updatedAt: "2026-10-24T01:00:00.000Z",
  approvedAt: null,
  approvedBy: null,
  ageGroup: "4-5y",
  developmentArea: "social-emotional",
  stemEnabled: false,
  folkGameEnabled: false,
  topic: "Bản thân & Tình bạn",
  duration: 20,
  space: "indoor",
  materials: ["Vỏ hộp sữa tái chế"],
  classNotes: null,
  ...sampleLessonPlan,
  guardViolations: [],
} as unknown as PlanDTO;

beforeEach(() => {
  usePlanStore.setState({ plans: {} });
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PlanCard trong khung chat", () => {
  it("hiện tên trò chơi, nhãn bản nháp AI, hộp pháp lý và cảnh báo an toàn", () => {
    render(<PlanCard data={{ kind: "plan", planId: "p1", plan, violations: [] }} />);
    expect(screen.getByRole("heading", { name: /Chuyến xe tình bạn/ })).toBeInTheDocument();
    expect(screen.getByText("Bản nháp AI")).toBeInTheDocument();
    expect(screen.getByLabelText("Căn cứ pháp lý")).toBeInTheDocument();
    expect(screen.getByLabelText("Cảnh báo an toàn")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mở chi tiết/ })).toHaveAttribute("href", "/teacher/plan/p1");
  });

  it("phê duyệt tại chỗ: gọi API, đổi nhãn sang Đã duyệt và mở nút tạo checklist", async () => {
    const user = userEvent.setup();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ plan: { ...plan, status: "approved" }, checklistId: "c1", criteria: ["a", "b", "c"] }),
    });
    render(<PlanCard data={{ kind: "plan", planId: "p1", plan, violations: [] }} />);
    await user.click(screen.getByRole("button", { name: /Phê duyệt/ }));
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe("/api/plans/p1/approve");
    expect(await screen.findByText("Đã duyệt")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ghi nhận quan sát/ })).toHaveAttribute("href", "/teacher/assess/p1");
    expect(screen.queryByRole("button", { name: /Phê duyệt/ })).not.toBeInTheDocument();
  });

  it("hiện lỗi nghiệp vụ thân thiện, không crash", async () => {
    const user = userEvent.setup();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: "ERR-FLOW-01", message: "Giáo án đã chia sẻ cho phụ huynh nên không thể chỉnh sửa" } }),
    });
    render(<PlanCard data={{ kind: "plan", planId: "p1", plan, violations: [] }} />);
    await user.click(screen.getByRole("button", { name: /Phê duyệt/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/không thể chỉnh sửa/);
  });

  it("liệt kê các điểm chưa đạt tiêu chí để cô xem lại", () => {
    render(<PlanCard data={{ kind: "plan", planId: "p1", plan, violations: ["Bắt buộc [an-toan-vat-lieu]: Thiếu cảnh báo cho \"Hạt nhựa\""] }} />);
    expect(screen.getByText(/1 điểm cần cô xem lại/)).toBeInTheDocument();
    expect(screen.getByText(/Thiếu cảnh báo cho "Hạt nhựa"/)).toBeInTheDocument();
  });

  it("agent chuẩn bị phê duyệt: thẻ nói rõ trợ lý không tự duyệt, cô phải bấm nút", () => {
    render(<PlanCard data={{ kind: "plan", planId: "p1", plan, violations: [], awaiting: "approve" }} />);
    expect(screen.getByRole("status")).toHaveTextContent(/không tự phê duyệt/);
    expect(screen.getByRole("button", { name: /Phê duyệt/ })).toBeInTheDocument();
  });
});

describe("PlanCard khôi phục từ lịch sử", () => {
  it("nạp trạng thái mới nhất từ server (bài đã duyệt thì không còn nút Phê duyệt)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ plan: { ...plan, status: "approved", updatedAt: "2026-10-25T01:00:00.000Z" } }) });
    render(<PlanCard data={{ kind: "plan", planId: "p1", plan, violations: [] }} restored />);
    expect(await screen.findByText("Đã duyệt")).toBeInTheDocument();
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe("/api/plans/p1");
    expect(screen.queryByRole("button", { name: /Phê duyệt/ })).not.toBeInTheDocument();
  });

  it("không gọi server khi là thẻ vừa tạo trong lượt này", () => {
    render(<PlanCard data={{ kind: "plan", planId: "p1", plan, violations: [] }} />);
    expect(fetch).not.toHaveBeenCalled();
  });
});
