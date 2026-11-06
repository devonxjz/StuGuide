import { describe, it, expect } from "vitest";
import { EmptyDocumentError, UnsupportedDocumentError, detectKind, extractDocumentText } from "@/ai/documents/extract";

const file = (name: string, type: string, content: string | Buffer) => ({ name, type, bytes: Buffer.from(content) });

/** PDF tối thiểu một trang chứa đoạn chữ Latin (đủ để kiểm tra đường đọc PDF thật). */
function tinyPdf(text: string) {
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 100] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${`BT /F1 18 Tf 20 50 Td (${text}) Tj ET`.length} >>\nstream\nBT /F1 18 Tf 20 50 Td (${text}) Tj ET\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out);
}

describe("nhận diện loại tài liệu", () => {
  it.each([
    ["a.pdf", "application/pdf", "pdf"],
    ["a.pdf", "", "pdf"],
    ["a.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
    ["a.docx", "application/octet-stream", "docx"],
    ["a.txt", "text/plain", "text"],
    ["a.md", "", "text"],
    ["a.csv", "application/vnd.ms-excel", "text"],
    ["a.json", "application/json", "text"],
  ])("%s (%s) → %s", (name, type, kind) => {
    expect(detectKind(name, type)).toBe(kind);
  });

  it("định dạng khác bị từ chối", () => {
    expect(() => detectKind("a.exe", "application/x-msdownload")).toThrow(UnsupportedDocumentError);
    expect(() => detectKind("a.png", "image/png")).toThrow(UnsupportedDocumentError);
  });
});

describe("extractDocumentText", () => {
  it("văn bản: chuẩn hóa xuống dòng/khoảng trắng và Unicode NFC", async () => {
    const decomposed = "Tiếng Việt".normalize("NFD");
    const doc = await extractDocumentText(file("a.txt", "text/plain", `${decomposed}  \r\n\r\n\r\n\r\nDòng hai\t\n`));
    expect(doc.text).toBe("Tiếng Việt\n\nDòng hai");
    expect(doc.truncated).toBe(false);
  });

  it("cắt theo giới hạn ký tự và báo đã cắt kèm tổng độ dài", async () => {
    const doc = await extractDocumentText(file("a.txt", "text/plain", "x".repeat(500)), 100);
    expect(doc.text).toHaveLength(100);
    expect(doc).toMatchObject({ truncated: true, totalChars: 500 });
  });

  it("tệp rỗng/chỉ khoảng trắng → EmptyDocumentError", async () => {
    await expect(extractDocumentText(file("a.txt", "text/plain", " \n\t "))).rejects.toBeInstanceOf(EmptyDocumentError);
  });

  it("đọc được PDF có chữ", async () => {
    const doc = await extractDocumentText(file("a.pdf", "application/pdf", tinyPdf("Giao an STEM")));
    expect(doc.text).toContain("Giao an STEM");
  });

  it("PDF/DOCX hỏng → thông báo không đọc được (không lộ lỗi nội bộ)", async () => {
    await expect(extractDocumentText(file("a.pdf", "application/pdf", "không phải pdf"))).rejects.toThrow(/Không đọc được/);
    await expect(extractDocumentText(file("a.docx", "", "không phải docx"))).rejects.toBeInstanceOf(UnsupportedDocumentError);
  });
});
