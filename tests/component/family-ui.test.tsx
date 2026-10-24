// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShortTermProvider, useShortTerm } from "@/components/parent/short-term-context";
import { HomeActivityCard } from "@/components/parent/cards/home-activity-card";
import { ChildProgressCard } from "@/components/parent/cards/child-progress-card";
import { ChildMemoryPanel } from "@/components/parent/child-memory-panel";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const activity = {
  title: "Khủng long tìm trứng",
  minutes: 5,
  whyForThisChild: "Hợp với bé vì bé mê khủng long.",
  materials: ["Tất cuộn tròn làm trứng", "Hộp giấy làm tổ"],
  steps: ["Giấu trứng quanh phòng", "Cùng bé đi tìm", "Bỏ trứng vào tổ và đếm"],
  eqQuestion: "Con thích nhất lúc nào?",
  parentTip: "Làm mẫu trước một lần.",
};

let sendBeacon: ReturnType<typeof vi.fn>;
beforeEach(() => {
  sendBeacon = vi.fn().mockReturnValue(true);
  Object.defineProperty(navigator, "sendBeacon", { value: sendBeacon, configurable: true });
});
afterEach(cleanup);

const lastBody = async () => JSON.parse(await (sendBeacon.mock.calls.at(-1)![1] as Blob).text());

describe("Bộ nhớ ngắn hạn trong giao diện phụ huynh", () => {
  it("thao tác trên thẻ hoạt động chỉ nằm trong RAM; khi tab bị ẩn (pagehide) mới đẩy lên server một lần", async () => {
    const user = userEvent.setup();
    render(
      <ShortTermProvider studentId="s1">
        <HomeActivityCard data={{ kind: "home-activity", studentId: "s1", activity }} />
      </ShortTermProvider>,
    );
    await user.click(screen.getByRole("checkbox", { name: /Giấu trứng quanh phòng/ }));
    await user.click(screen.getByRole("button", { name: /Bé rất thích/ }));
    expect(sendBeacon).not.toHaveBeenCalled(); // đang dùng: chưa ghi DB

    act(() => void window.dispatchEvent(new Event("pagehide")));
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const body = await lastBody();
    expect(body.studentId).toBe("s1");
    expect(body.events.map((e: { type: string }) => e.type)).toEqual(expect.arrayContaining(["view", "activity-step", "reaction"]));
    expect(body.events.find((e: { type: string }) => e.type === "activity-step").data).toMatchObject({ step: 1, done: true, title: "Khủng long tìm trứng" });
  });

  it("ghi chú của phụ huynh trên thẻ được ghi vào bộ nhớ ngắn hạn", async () => {
    const user = userEvent.setup();
    render(
      <ShortTermProvider studentId="s1">
        <HomeActivityCard data={{ kind: "home-activity", studentId: "s1", activity }} />
      </ShortTermProvider>,
    );
    await user.type(screen.getByLabelText(/Bé phản ứng thế nào/), "Bé cười suốt và đòi chơi lại");
    await user.click(screen.getByRole("button", { name: /Lưu ghi chú/ }));
    act(() => void window.dispatchEvent(new Event("pagehide")));
    const body = await lastBody();
    expect(body.events.find((e: { type: string }) => e.type === "note").data.text).toBe("Bé cười suốt và đòi chơi lại");
  });

  it("hiển thị trạng thái 'lưu tạm trong bộ nhớ máy' cho phụ huynh biết dữ liệu ghi khi nào", () => {
    function Probe() {
      const st = useShortTerm();
      return <span>{st ? "có" : "không"}</span>;
    }
    render(
      <ShortTermProvider studentId="s1">
        <Probe />
      </ShortTermProvider>,
    );
    expect(screen.getByText("có")).toBeInTheDocument();
  });
});

describe("ChildProgressCard", () => {
  it("hiện từng mảng với nhãn tích cực, không dán nhãn bé", () => {
    render(
      <ChildProgressCard
        data={{
          kind: "child-progress",
          progress: [
            { area: "social-emotional", label: "Tình cảm & KNXH", total: 3, excellent: 1, achieved: 1, practicing: 1, level: "Đã đạt" },
            { area: "physical", label: "Thể chất", total: 2, excellent: 0, achieved: 0, practicing: 2, level: "Đang rèn thêm" },
          ],
        }}
      />,
    );
    expect(screen.getByText("Tình cảm & KNXH")).toBeInTheDocument();
    expect(screen.getByText("Đang rèn thêm")).toBeInTheDocument();
    expect(screen.queryByText(/yếu|kém|bệnh/i)).not.toBeInTheDocument();
  });
});

describe("Công tắc chia sẻ hồ sơ với cô giáo", () => {
  it("mặc định tắt và giải thích rõ; bật thì gọi API, đổi lời giải thích; lỗi thì hiện thông báo", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ shared: true }) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ChildMemoryPanel studentId="s1" childName="Huy" items={[]} />);
    const sw = screen.getByRole("switch", { name: /Chia sẻ hồ sơ của Huy với cô giáo/ });
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/cô giáo không xem được/i)).toBeInTheDocument();

    await user.click(sw);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/family/sharing");
    expect(JSON.parse(init.body)).toEqual({ studentId: "s1", shared: true });
    expect(await screen.findByText(/Cô không thấy nội dung trò chuyện/)).toBeInTheDocument();
    expect(sw).toHaveAttribute("aria-checked", "true");

    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ error: { code: "ERR-AUTH-01", message: "Không có quyền" } }) });
    await user.click(sw);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không có quyền");
    vi.unstubAllGlobals();
  });
});
