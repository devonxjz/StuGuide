// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Composer } from "@/components/teacher/chat/composer";
import { MessageView } from "@/components/teacher/chat/message-view";
import type { StuGuideMessage } from "@/types/chat";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("Composer", () => {
  it("Enter để gửi, Shift+Enter xuống dòng, xóa ô sau khi gửi", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer onSend={onSend} busy={false} />);
    const box = screen.getByRole("textbox", { name: /Nhắn cho StuGuide/ });
    await user.type(box, "Soạn trò chơi{Shift>}{Enter}{/Shift}mới{Enter}");
    expect(onSend).toHaveBeenCalledWith("Soạn trò chơi\nmới");
    expect(box).toHaveValue("");
  });

  it("không gửi khi trống hoặc đang bận", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const { rerender } = render(<Composer onSend={onSend} busy={false} />);
    await user.click(screen.getByRole("button", { name: /Gửi/ }));
    expect(onSend).not.toHaveBeenCalled();
    rerender(<Composer onSend={onSend} busy />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("khôi phục bản nháp chưa gửi sau khi tải lại (BR-007)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const first = render(<Composer onSend={vi.fn()} busy={false} />);
    await user.type(screen.getByRole("textbox"), "Soạn dở dang");
    await vi.advanceTimersByTimeAsync(600);
    first.unmount();
    vi.useRealTimers();
    render(<Composer onSend={vi.fn()} busy={false} />);
    expect(screen.getByRole("textbox")).toHaveValue("Soạn dở dang");
  });
});

describe("MessageView", () => {
  it("tin nhắn người dùng và trợ lý; thẻ thông báo (notice) hiển thị trong luồng", () => {
    const messages: StuGuideMessage[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Gửi thẻ cho phụ huynh" }] },
      {
        id: "2",
        role: "assistant",
        parts: [
          { type: "data-card", data: { kind: "notice", tone: "warning", message: "Vui lòng rà soát và Phê duyệt kế hoạch trước khi gửi cho phụ huynh" } },
          { type: "text", text: "Mình chưa gửi được ạ." },
        ],
      },
    ];
    render(<>{messages.map((m) => <MessageView key={m.id} message={m} />)}</>);
    expect(screen.getByText("Gửi thẻ cho phụ huynh")).toBeInTheDocument();
    expect(screen.getByText(/Vui lòng rà soát và Phê duyệt/)).toBeInTheDocument();
    expect(screen.getByText("Mình chưa gửi được ạ.")).toBeInTheDocument();
  });
});
