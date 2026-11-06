// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MessageView } from "@/components/teacher/chat/message-view";
import { attachmentToText } from "@/lib/attachments";
import type { StuGuideMessage } from "@/types/chat";

afterEach(cleanup);

const userMessage = (...texts: string[]) => ({ id: "m1", role: "user", parts: texts.map((text) => ({ type: "text", text })) }) as StuGuideMessage;

describe("MessageView – tin nhắn của cô có tài liệu đính kèm", () => {
  it("hiện chip tên tệp và lời của cô; nội dung tài liệu (dành cho AI) không hiện ra khung chat", () => {
    const doc = attachmentToText({ name: "ke-hoach.pdf", text: "BÍ MẬT: nội dung rất dài của tài liệu" });
    render(<MessageView message={userMessage("Tóm tắt giúp mình", doc)} />);
    expect(screen.getByText("ke-hoach.pdf")).toBeInTheDocument();
    expect(screen.getByText("Tóm tắt giúp mình")).toBeInTheDocument();
    expect(screen.queryByText(/BÍ MẬT/)).not.toBeInTheDocument();
    expect(screen.queryByText(/DỮ LIỆU/)).not.toBeInTheDocument();
  });

  it("nhiều tài liệu → nhiều chip; chỉ có tài liệu (không lời) thì không dựng bong bóng trống", () => {
    const { container } = render(
      <MessageView message={userMessage(attachmentToText({ name: "a.pdf", text: "x" }), attachmentToText({ name: "b.docx", text: "y" }))} />,
    );
    expect(screen.getByText("a.pdf")).toBeInTheDocument();
    expect(screen.getByText("b.docx")).toBeInTheDocument();
    expect(container.querySelector("p")).toBeNull();
  });

  it("tin nhắn thường không đổi", () => {
    render(<MessageView message={userMessage("Soạn trò chơi cho lớp 4–5 tuổi")} />);
    expect(screen.getByText("Soạn trò chơi cho lớp 4–5 tuổi")).toBeInTheDocument();
  });
});
