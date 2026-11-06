import { describe, it, expect } from "vitest";
import { renderParentCardEmail } from "@/server/mail/parent-card-email";

const content = {
  greeting: "Chào bố mẹ yêu quý!",
  classSummary: "Hôm nay các con chơi <trò chơi> & vui lắm.",
  missionTitle: "Trò chuyện cùng con",
  duration: 5,
  eqQuestions: ["Con thấy vui không?", "Con giúp bạn điều gì?"],
  adultRole: "Bố mẹ lắng nghe con nhé.",
};
const base = { content, gameName: "Chuyến xe tình bạn", className: "Lớp 1A", teacherName: "Lan", studentName: "Gia Huy" };

describe("renderParentCardEmail", () => {
  it("có tiêu đề một dòng, bản HTML và bản chữ thuần", () => {
    const m = renderParentCardEmail({ ...base, url: "https://x.test/parent/abc" });
    expect(m.subject).toBe("Lớp 1A · Thẻ nhiệm vụ 5 phút cho bé Gia Huy");
    expect(m.html).toContain("Con thấy vui không?");
    expect(m.text).toContain("1. Con thấy vui không?");
    expect(m.text).toContain("https://x.test/parent/abc");
  });

  it("thoát ký tự HTML trong nội dung", () => {
    const m = renderParentCardEmail(base);
    expect(m.html).toContain("&lt;trò chơi&gt; &amp; vui lắm");
    expect(m.html).not.toContain("<trò chơi>");
  });

  it("chỉ hiện khối nhận xét khi cô có nhận xét; nhận xét cũng được thoát ký tự", () => {
    expect(renderParentCardEmail(base).html).not.toContain("Nhận xét của cô");
    expect(renderParentCardEmail({ ...base, teacherNote: "   " }).html).not.toContain("Nhận xét của cô");
    const m = renderParentCardEmail({ ...base, teacherNote: "Bé <ngoan>" });
    expect(m.html).toContain("Nhận xét của cô về bé Gia Huy");
    expect(m.html).toContain("Bé &lt;ngoan&gt;");
    expect(m.text).toContain("Bé <ngoan>");
  });
});
