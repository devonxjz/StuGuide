// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MarkdownText } from "@/components/shared/markdown-text";
import { MessageView } from "@/components/teacher/chat/message-view";
import type { StuGuideMessage } from "@/types/chat";

afterEach(cleanup);

describe("MarkdownText", () => {
  it("không còn hiện dấu ** và #; chữ đậm thành <strong>", () => {
    const { container } = render(<MarkdownText text={"## Gợi ý\n\n1. **Góc Siêu Thị**\nTrẻ vào vai người bán hàng"} />);
    expect(container.textContent).not.toMatch(/\*\*|#/);
    expect(screen.getByText("Góc Siêu Thị").tagName).toBe("STRONG");
    expect(screen.getByText("Gợi ý")).toBeInTheDocument();
  });

  it("danh sách đánh số thành <ol>, giữ số bắt đầu khác 1", () => {
    const { container } = render(<MarkdownText text={"1. a\n2. b"} />);
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    expect(container.querySelector("ol")).not.toHaveAttribute("start");

    cleanup();
    const second = render(<MarkdownText text={"3. c"} />);
    expect(second.container.querySelector("ol")).toHaveAttribute("start", "3");
  });

  it("gạch đầu dòng thành <ul>", () => {
    const { container } = render(<MarkdownText text={"- a\n- b"} />);
    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
  });

  it("xuống dòng trong một đoạn thành <br>", () => {
    const { container } = render(<MarkdownText text={"Dòng 1\nDòng 2"} />);
    expect(container.querySelectorAll("p br")).toHaveLength(1);
  });

  it("nghiêng, code và đường kẻ", () => {
    const { container } = render(<MarkdownText text={"*nhẹ nhàng* và `rổ`\n\n---"} />);
    expect(screen.getByText("nhẹ nhàng").tagName).toBe("EM");
    expect(screen.getByText("rổ").tagName).toBe("CODE");
    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  it("chuỗi HTML do AI sinh ra chỉ hiện như chữ, không chạy được (chống XSS)", () => {
    const { container } = render(<MarkdownText text={'<img src=x onerror="alert(1)"> **đậm**'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">');
  });
});

describe("MessageView", () => {
  const assistant = (text: string): StuGuideMessage => ({ id: "a1", role: "assistant", parts: [{ type: "text", text }] }) as StuGuideMessage;

  it("câu trả lời AI nằm trong khối nền xám, đã format markdown", () => {
    const { container } = render(<MessageView message={assistant("Gợi ý **Góc Siêu Thị**")} />);
    const block = screen.getByText("Góc Siêu Thị").closest("div");
    expect(block).toHaveClass("bg-slate-100");
    expect(container.textContent).not.toContain("**");
  });

  it("phần văn bản rỗng không tạo khối xám trống", () => {
    const { container } = render(<MessageView message={assistant("   ")} />);
    expect(container.querySelector(".bg-slate-100")).toBeNull();
  });

  it("tin của cô giữ nguyên chữ (không format markdown)", () => {
    render(<MessageView message={{ id: "u1", role: "user", parts: [{ type: "text", text: "**giữ nguyên**" }] } as StuGuideMessage} />);
    expect(screen.getByText("**giữ nguyên**")).toBeInTheDocument();
  });
});
