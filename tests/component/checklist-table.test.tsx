// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChecklistTable, deriveOverall } from "@/components/teacher/checklist-table";

const students = [
  { id: "s1", fullName: "Trần Gia Huy", avatarEmoji: "🐻" },
  { id: "s2", fullName: "Nguyễn Minh Anh", avatarEmoji: "🐰" },
  { id: "s3", fullName: "Lê Bảo Châu", avatarEmoji: "🦋" },
];
const criteria = ["Chủ động rủ bạn cùng chơi", "Nắm tay bạn khi di chuyển", "Chờ đến lượt"];
const alerts = [
  { id: "a1", studentId: "s1", studentName: "Trần Gia Huy", pattern: "Có biểu hiện ngập ngừng trong giao tiếp nhóm qua 3 tuần liên tiếp", weekCount: 3, skillArea: "Kỹ năng giao tiếp nhóm", suggestedActivity: 'Trò chơi "Cặp đôi tí hon"', disclaimer: "Đây không phải chẩn đoán y khoa hay kết luận tâm lý." },
];

const renderTable = (extra = {}) =>
  render(<ChecklistTable planId="p1" checklistId="c1" criteria={criteria} students={students} initial={{}} alerts={alerts} {...extra} />);

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("deriveOverall", () => {
  it("cần rèn thêm nếu có bất kỳ tiêu chí nào chưa đạt; tốt nếu tất cả tốt", () => {
    expect(deriveOverall({ 0: "achieved", 1: "needs_practice" })).toBe("needs_practice");
    expect(deriveOverall({ 0: "excellent", 1: "excellent" })).toBe("excellent");
    expect(deriveOverall({ 0: "excellent", 1: "achieved" })).toBe("achieved");
  });
});

describe("ChecklistTable (Màn hình 5 – 30 giây)", () => {
  it("khóa nút lưu cho tới khi đánh giá đủ cả lớp", () => {
    renderTable();
    expect(screen.getByRole("button", { name: /Lưu hồ sơ/ })).toBeDisabled();
    expect(screen.getByText(/Còn 3 bé chưa đánh giá/)).toBeInTheDocument();
  });

  it("⚡ Đánh dấu tất cả 'Đã đạt' xong, chỉ sửa 1 bé", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getByRole("button", { name: /Đánh dấu tất cả/ }));
    expect(screen.getByRole("button", { name: /Lưu hồ sơ/ })).toBeEnabled();

    const row = screen.getByRole("row", { name: /Trần Gia Huy/ });
    await user.click(within(row).getByRole("button", { name: /Cần rèn thêm/ }));
    expect(within(row).getByRole("button", { name: /Cần rèn thêm/ })).toHaveAttribute("aria-pressed", "true");
    const other = screen.getByRole("row", { name: /Lê Bảo Châu/ });
    expect(within(other).getByRole("button", { name: /Đã đạt/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("gửi đúng payload (rating tổng + từng tiêu chí + ghi chú) và hiện cảnh báo trả về", async () => {
    const user = userEvent.setup();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ alerts }) });
    renderTable();
    await user.click(screen.getByRole("button", { name: /Đánh dấu tất cả/ }));
    const row = screen.getByRole("row", { name: /Trần Gia Huy/ });
    await user.click(within(row).getByRole("button", { name: /Cần rèn thêm/ }));
    await user.type(within(row).getByPlaceholderText(/Ghi chú khách quan/), "Bé đứng quan sát");
    await user.click(screen.getByRole("button", { name: /Lưu hồ sơ/ }));

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/assess/p1");
    const body = JSON.parse(init.body);
    expect(body.checklistId).toBe("c1");
    expect(body.entries).toHaveLength(3);
    const huy = body.entries.find((e: { studentId: string }) => e.studentId === "s1");
    expect(huy).toMatchObject({ overallRating: "needs_practice", note: "Bé đứng quan sát", ratings: { "0": "needs_practice", "1": "needs_practice", "2": "needs_practice" } });

    expect(await screen.findByText(/Gợi ý quan sát sâu cho bé Trần Gia Huy/)).toBeInTheDocument();
    expect(screen.getByText(/không phải chẩn đoán/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tạo Thẻ nhiệm vụ 5 phút/ })).toBeEnabled();
  });

  it("tự lưu nháp sau 500ms và khôi phục khi mở lại (BR-007)", async () => {
    vi.useFakeTimers();
    const first = renderTable();
    await act(async () => {
      screen.getByRole("button", { name: /Đánh dấu tất cả/ }).click();
    });
    expect(localStorage.getItem("sg:assess:c1")).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(localStorage.getItem("sg:assess:c1")).toContain("achieved");

    first.unmount();
    renderTable();
    expect(screen.getByRole("button", { name: /Lưu hồ sơ/ })).toBeEnabled();
  });
});
