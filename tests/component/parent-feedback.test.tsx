// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParentExperience } from "@/components/parent/parent-experience";

const view = {
  student: { id: "s1", fullName: "Trần Gia Huy", emoji: "🐻", className: "Lớp MG nhỡ B1" },
  teacherName: "Cô Nguyễn Thị Lan",
  gameName: "Chuyến xe tình bạn – Thu gom hộp sữa",
  card: {
    greeting: "Chào bố mẹ của bé!",
    classSummary: "Hôm nay lớp mình lái xe buýt tình bạn.",
    missionTitle: "5 phút trò chuyện trước giờ đi ngủ",
    duration: 5,
    eqQuestions: ["Con vui nhất lúc nào?", "Con đã giúp bạn nào?"],
    adultRole: "Bố mẹ chỉ cần lắng nghe.",
  },
  feedback: null,
};

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Giao diện phụ huynh (Màn hình 7)", () => {
  it("hiện tên bé, tóm tắt, câu hỏi EQ và nhãn không cần cài app", () => {
    render(<ParentExperience token="t1" view={view} />);
    expect(screen.getByText(/Không cần cài đặt ứng dụng/)).toBeInTheDocument();
    expect(screen.getByText("Trần Gia Huy")).toBeInTheDocument();
    expect(screen.getByText("Con vui nhất lúc nào?")).toBeInTheDocument();
    expect(screen.getByText(/Hôm nay ở lớp con làm gì/)).toBeInTheDocument();
  });

  it("chạm 'Bé đã hoàn thành' gửi phản hồi và hiện lời cảm ơn", async () => {
    const user = userEvent.setup();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ response: "completed", stats: {} }) });
    render(<ParentExperience token="t1" view={view} />);
    await user.type(screen.getByPlaceholderText(/Nhắn gửi cô giáo/), "Con rất thích ạ");
    await user.click(screen.getByRole("button", { name: /Bé đã hoàn thành/ }));

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/feedback");
    expect(JSON.parse(init.body)).toEqual({ token: "t1", response: "completed", message: "Con rất thích ạ" });
    expect(await screen.findByText(/Cảm ơn bố mẹ/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bé đã hoàn thành/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("đã phản hồi trước đó thì hiện sẵn trạng thái, vẫn đổi ý được", () => {
    render(<ParentExperience token="t1" view={{ ...view, feedback: { response: "needs_practice", message: null } }} />);
    expect(screen.getByRole("button", { name: /Bé cần rèn thêm/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("không còn nút demo 'Thử xem hồ sơ bé khác' (không lộ id bé khác ra trang phụ huynh)", () => {
    render(<ParentExperience token="t1" view={view} />);
    expect(screen.queryByRole("button", { name: /Thử xem hồ sơ bé khác/ })).not.toBeInTheDocument();
  });
});
