import { describe, it, expect } from "vitest";
import { cleanString, normalizeInput, readJsonBody, readUploadedFile } from "@/server/security/input";

const req = (body: string | null, headers: Record<string, string> = { "content-type": "application/json" }) =>
  new Request("http://localhost/api/x", { method: "POST", headers, body });

describe("chuẩn hóa đầu vào – lớp lọc 2", () => {
  it("chuẩn hóa Unicode NFC (tiếng Việt tổ hợp) và bỏ ký tự vô hình/điều khiển, giữ xuống dòng", () => {
    const decomposed = "Tiếng Việt"; // dấu tổ hợp
    expect(cleanString(decomposed)).toBe("Tiếng Việt");
    expect(cleanString("a​b‮c\u0000d﻿")).toBe("abcd");
    expect(cleanString("dòng 1\ndòng 2\tx")).toBe("dòng 1\ndòng 2\tx");
  });

  it("duyệt sâu: chuẩn hóa cả khóa và giá trị lồng nhau", () => {
    expect(normalizeInput({ "a​": ["x\u0000", { b: "y‮" }] })).toEqual({ a: ["x", { b: "y" }] });
  });

  it("chặn prototype pollution", () => {
    expect(() => normalizeInput(JSON.parse('{"__proto__": {"admin": true}}'))).toThrow(/không được phép/);
    expect(() => normalizeInput({ nested: { constructor: {} } })).toThrow();
  });

  it("chặn cấu trúc bất thường: quá sâu, quá nhiều khóa, mảng quá dài", () => {
    let deep: unknown = "x";
    for (let i = 0; i < 12; i++) deep = { d: deep };
    expect(() => normalizeInput(deep)).toThrow(/sâu/);
    expect(() => normalizeInput(Object.fromEntries(Array.from({ length: 201 }, (_, i) => [`k${i}`, i])))).toThrow(/nhiều trường/);
    expect(() => normalizeInput(new Array(1001).fill(0))).toThrow(/dài/);
  });

  it("đọc body: JSON hợp lệ; rỗng → undefined; JSON hỏng → 400; sai kiểu → 415", async () => {
    expect(await readJsonBody(req('{"a":"x​"}'))).toEqual({ a: "x" });
    expect(await readJsonBody(req(null))).toBeUndefined();
    await expect(readJsonBody(req("{bad"))).rejects.toMatchObject({ status: 400, code: "ERR-INPUT-01" });
    await expect(readJsonBody(req('{"a":1}', { "content-type": "text/plain" }))).rejects.toMatchObject({ status: 415 });
  });

  it("đếm byte thực tế (không tin Content-Length): body vượt giới hạn → 413", async () => {
    await expect(readJsonBody(req(JSON.stringify({ a: "x".repeat(200) })), 100)).rejects.toMatchObject({ status: 413, code: "ERR-INPUT-413" });
    await expect(readJsonBody(req("{}", { "content-type": "application/json", "content-length": "999999" }), 100)).rejects.toMatchObject({ status: 413 });
  });

  it("chuỗi đa byte (tiếng Việt) được đếm theo byte UTF-8", async () => {
    const body = JSON.stringify({ a: "ệ".repeat(40) }); // ~120 byte
    await expect(readJsonBody(req(body), 100)).rejects.toMatchObject({ status: 413 });
  });
});

describe("đọc tệp tải lên (multipart)", () => {
  /** Dựng body multipart thành byte sẵn (giống dữ liệu nhận từ mạng) thay vì stream của FormData */
  const upload = async (file: File | null, headers: Record<string, string> = {}) => {
    const form = new FormData();
    if (file) form.set("file", file);
    const encoded = new Response(form);
    const body = Buffer.from(await encoded.arrayBuffer());
    return new Request("http://localhost/api/chat/attachments", { method: "POST", body, headers: { "content-type": encoded.headers.get("content-type")!, ...headers } });
  };

  it("đọc được tệp: tên đã làm sạch, MIME bỏ tham số và viết thường", async () => {
    const r = await readUploadedFile(await upload(new File(["xin chào"], "bài\u200B học.txt", { type: "Audio/WebM;codecs=opus" })), 1024);
    expect(r.name).toBe("bài học.txt");
    expect(r.type).toBe("audio/webm");
    expect(r.bytes.toString()).toBe("xin chào");
  });

  it("sai kiểu nội dung → 415; không có tệp/tệp rỗng → 400", async () => {
    const json = new Request("http://localhost/x", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    await expect(readUploadedFile(json, 1024)).rejects.toMatchObject({ status: 415 });
    await expect(readUploadedFile(await upload(null), 1024)).rejects.toMatchObject({ status: 400 });
    await expect(readUploadedFile(await upload(new File([], "a.txt")), 1024)).rejects.toMatchObject({ status: 400 });
  });

  it("quá lớn → 413 dù Content-Length khai gian nhỏ (đếm byte thực tế)", async () => {
    const big = new File(["x".repeat(10_000)], "big.txt", { type: "text/plain" });
    await expect(readUploadedFile(await upload(big), 1024)).rejects.toMatchObject({ status: 413 });
    await expect(readUploadedFile(await upload(big, { "content-length": "10" }), 1024)).rejects.toMatchObject({ status: 413 });
    const declaredHuge = await upload(new File(["x"], "a.txt"), { "content-length": String(10 * 1024 * 1024) });
    await expect(readUploadedFile(declaredHuge, 1024)).rejects.toMatchObject({ status: 413 });
  });

  it("body multipart hỏng → 400", async () => {
    const broken = new Request("http://localhost/x", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=zzz" }, body: "rác không có ranh giới" });
    await expect(readUploadedFile(broken, 1024)).rejects.toMatchObject({ status: 400 });
  });
});
