// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatWorkspace } from "@/components/teacher/chat/chat-workspace";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

/** Server giả: /api/chat trả phản hồi do từng test quy định */
const stubServer = (chatResponse: () => Response) => vi.stubGlobal("fetch", vi.fn(async () => chatResponse()));

const sendMessage = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: /Nhắn cho StuGuide/ }), "Soạn trò chơi vận động{Enter}");
};

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn(); // jsdom không có scrollIntoView
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ChatWorkspace – thông báo lỗi khi gửi tin", () => {
  it("429 do bấm quá nhanh: hiện đúng lời server, vẫn cho gửi lại, không khóa ô nhập", async () => {
    stubServer(() => Response.json({ error: { code: "ERR-RATE-01", message: "Thao tác quá nhanh, vui lòng thử lại sau 30 giây" } }, { status: 429 }));
    render(<ChatWorkspace teacherName="Cô Nguyễn Thị Lan" className="Lớp Chồi B1" />);
    await sendMessage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Thao tác quá nhanh, vui lòng thử lại sau 30 giây");
    expect(screen.getByRole("button", { name: /Gửi lại/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Nhắn cho StuGuide/ })).not.toBeDisabled();
  });

  it("lỗi server 500: hiện câu chung, không lộ chi tiết kỹ thuật", async () => {
    stubServer(() => Response.json({ error: { code: "ERR-INTERNAL", message: "Có lỗi xảy ra, vui lòng thử lại" } }, { status: 500 }));
    render(<ChatWorkspace teacherName="Cô Nguyễn Thị Lan" className="Lớp Chồi B1" />);
    await sendMessage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Hệ thống AI phản hồi hơi lâu hoặc đang bận");
  });
});
