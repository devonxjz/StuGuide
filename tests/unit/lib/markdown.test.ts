import { describe, it, expect } from "vitest";
import { parseInline, parseMarkdown, type Inline } from "@/lib/markdown";

const t = (text: string): Inline => ({ type: "text", text });
const strong = (...children: Inline[]): Inline => ({ type: "strong", children });
const em = (...children: Inline[]): Inline => ({ type: "em", children });

describe("parseInline", () => {
  it("chữ thường giữ nguyên; chuỗi rỗng → không có phần tử", () => {
    expect(parseInline("Xin chào cô")).toEqual([t("Xin chào cô")]);
    expect(parseInline("")).toEqual([]);
  });

  it("**đậm**, *nghiêng* và `code`", () => {
    expect(parseInline("Trò **Góc Siêu Thị** rất *vui* với `rổ nhựa`")).toEqual([
      t("Trò "),
      strong(t("Góc Siêu Thị")),
      t(" rất "),
      em(t("vui")),
      t(" với "),
      { type: "code", text: "rổ nhựa" },
    ]);
  });

  it("lồng nghiêng trong đậm", () => {
    expect(parseInline("**Bé *rất* giỏi**")).toEqual([strong(t("Bé "), em(t("rất")), t(" giỏi"))]);
  });

  it("dấu ** lẻ (AI đang stream chưa đóng) bị ẩn", () => {
    expect(parseInline("1. **Góc Siêu Th")).toEqual([t("1. Góc Siêu Th")]);
    expect(parseInline("**")).toEqual([]);
  });

  it("dấu * cách chữ (phép nhân) không bị hiểu là nghiêng", () => {
    expect(parseInline("5 * 3 = 15")).toEqual([t("5 * 3 = 15")]);
  });

  it("nội dung trong `code` giữ nguyên dấu **", () => {
    expect(parseInline("`**x**`")).toEqual([{ type: "code", text: "**x**" }]);
  });
});

describe("parseMarkdown – đoạn văn", () => {
  it("dòng trống tách đoạn; xuống dòng đơn giữ trong cùng đoạn", () => {
    expect(parseMarkdown("Dòng 1\nDòng 2\n\nĐoạn mới")).toEqual([
      { type: "paragraph", lines: [[t("Dòng 1")], [t("Dòng 2")]] },
      { type: "paragraph", lines: [[t("Đoạn mới")]] },
    ]);
  });

  it("nhiều dòng trống liên tiếp, khoảng trắng thừa và \\r\\n của Windows", () => {
    expect(parseMarkdown("  A  \r\n\r\n\r\n   \r\nB")).toEqual([
      { type: "paragraph", lines: [[t("A")]] },
      { type: "paragraph", lines: [[t("B")]] },
    ]);
  });

  it("văn bản rỗng → không có khối", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("\n \n")).toEqual([]);
  });
});

describe("parseMarkdown – tiêu đề và đường kẻ", () => {
  it("# … ###### thành tiêu đề, không lộ dấu #", () => {
    expect(parseMarkdown("### Gợi ý **hay**")).toEqual([{ type: "heading", line: [t("Gợi ý "), strong(t("hay"))] }]);
  });

  it("dấu # không có khoảng trắng phía sau là chữ thường", () => {
    expect(parseMarkdown("#hashtag")).toEqual([{ type: "paragraph", lines: [[t("#hashtag")]] }]);
  });

  it("---, *** và ___ là đường kẻ", () => {
    expect(parseMarkdown("A\n---\n***\n___")).toEqual([{ type: "paragraph", lines: [[t("A")]] }, { type: "rule" }, { type: "rule" }, { type: "rule" }]);
  });
});

describe("parseMarkdown – danh sách", () => {
  it("câu trả lời thật của AI: mục đánh số, mô tả từng dòng, cách nhau dòng trống → MỘT danh sách", () => {
    const answer = [
      "Em gợi ý:",
      "",
      "1. **Góc Siêu Thị**",
      "Trẻ vào vai người bán hàng",
      "→ Luyện nói cảm ơn",
      "",
      "2. **Hộp Bí Ẩn**",
      "→ Tư duy tìm giải pháp",
      "",
      "Cô chọn hướng nào?",
    ].join("\n");

    expect(parseMarkdown(answer)).toEqual([
      { type: "paragraph", lines: [[t("Em gợi ý:")]] },
      {
        type: "list",
        ordered: true,
        start: 1,
        items: [
          [[strong(t("Góc Siêu Thị"))], [t("Trẻ vào vai người bán hàng")], [t("→ Luyện nói cảm ơn")]],
          [[strong(t("Hộp Bí Ẩn"))], [t("→ Tư duy tìm giải pháp")]],
        ],
      },
      { type: "paragraph", lines: [[t("Cô chọn hướng nào?")]] },
    ]);
  });

  it("gạch đầu dòng -, *, +, • đều là danh sách không đánh số", () => {
    expect(parseMarkdown("- a\n* b\n+ c\n• d")).toEqual([{ type: "list", ordered: false, start: 1, items: [[[t("a")]], [[t("b")]], [[t("c")]], [[t("d")]]] }]);
  });

  it("danh sách bắt đầu từ số khác 1, dạng '3)'", () => {
    expect(parseMarkdown("3) ba\n4) bốn")).toMatchObject([{ type: "list", ordered: true, start: 3, items: [[[t("ba")]], [[t("bốn")]]] }]);
  });

  it("đổi loại danh sách (số → gạch) thì tách thành danh sách mới", () => {
    expect(parseMarkdown("1. a\n- b").map((b) => b.type === "list" && b.ordered)).toEqual([true, false]);
  });

  it("đoạn văn ngay trước danh sách (không có dòng trống) vẫn tách khối", () => {
    expect(parseMarkdown("Gợi ý:\n- a").map((b) => b.type)).toEqual(["paragraph", "list"]);
  });

  it("mô tả thụt lề sau dòng trống vẫn thuộc mục danh sách", () => {
    expect(parseMarkdown("1. a\n\n   mô tả a")).toEqual([{ type: "list", ordered: true, start: 1, items: [[[t("a")], [t("mô tả a")]]] }]);
  });

  it("năm ở đầu câu ('2026. …') không bị hiểu nhầm là danh sách", () => {
    expect(parseMarkdown("2026. Năm học mới")).toEqual([{ type: "paragraph", lines: [[t("2026. Năm học mới")]] }]);
  });

  it("**đậm** ở đầu dòng không bị hiểu nhầm là gạch đầu dòng *", () => {
    expect(parseMarkdown("**Lưu ý** an toàn")).toEqual([{ type: "paragraph", lines: [[strong(t("Lưu ý")), t(" an toàn")]] }]);
  });

  it("tiêu đề ngay sau danh sách tách khối mới", () => {
    expect(parseMarkdown("- a\n## Kết").map((b) => b.type)).toEqual(["list", "heading"]);
  });
});
