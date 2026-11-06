import { describe, it, expect } from "vitest";
import { findOtherStudentNames, matchStudentName, parseContactLines } from "@/core/student-matching";

const kids = [
  { id: "1", fullName: "Trần Gia Huy" },
  { id: "2", fullName: "Nguyễn Minh Anh" },
  { id: "3", fullName: "Phạm Gia Bảo" },
  { id: "4", fullName: "Lê Bảo Châu" },
];

describe("matchStudentName", () => {
  it("khớp họ tên đầy đủ, bỏ qua hoa/thường và tiền tố 'bé'", () => {
    expect(matchStudentName("bé Trần Gia Huy", kids)).toEqual({ kind: "found", student: kids[0] });
    expect(matchStudentName("  NGUYỄN MINH ANH ", kids)).toEqual({ kind: "found", student: kids[1] });
  });

  it("khớp theo tên gọi khi chỉ một bé có tên đó", () => {
    expect(matchStudentName("Huy", kids)).toEqual({ kind: "found", student: kids[0] });
  });

  it("báo mơ hồ khi nhiều bé cùng khớp thay vì đoán", () => {
    const r = matchStudentName("Gia", kids);
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") expect(r.candidates.map((c) => c.id).sort()).toEqual(["1", "3"]);
    expect(matchStudentName("Bảo", kids).kind).toBe("ambiguous");
  });

  it("không có bé nào / chuỗi rỗng → missing", () => {
    expect(matchStudentName("Tí", kids).kind).toBe("missing");
    expect(matchStudentName("   ", kids).kind).toBe("missing");
  });
});

describe("findOtherStudentNames", () => {
  const own = kids[0];
  it("thư chỉ nói về chính bé thì sạch", () => {
    expect(findOtherStudentNames("Kính gửi phụ huynh bé Trần Gia Huy, hôm nay bé chơi rất vui.", own, kids)).toEqual([]);
  });

  it("phát hiện họ tên đầy đủ hoặc 'bé + tên gọi' của bé khác", () => {
    expect(findOtherStudentNames("Bé Gia Huy chơi cùng Nguyễn Minh Anh.", own, kids)).toEqual(["Nguyễn Minh Anh"]);
    expect(findOtherStudentNames("Huy đã nhường đồ chơi cho bạn Châu.", own, kids)).toEqual(["Lê Bảo Châu"]);
  });

  it("không báo nhầm từ thường trùng tên gọi (vd. 'bảo vệ', 'minh bạch')", () => {
    expect(findOtherStudentNames("Cô nhắc bé biết bảo vệ đồ chơi và chia sẻ minh bạch.", own, kids)).toEqual([]);
  });
});

describe("parseContactLines", () => {
  it("đọc CSV/dán từ Excel, bỏ dòng tiêu đề, dòng trống và dòng thiếu email", () => {
    const rows = parseContactLines('Tên bé,Email\r\n"Trần Gia Huy", me@gmail.com\nNguyễn Minh Anh;bo@gmail.com\n\nThiếu email,\nLê Bảo Châu\tcha@gmail.com');
    expect(rows).toEqual([
      { studentName: "Trần Gia Huy", email: "me@gmail.com" },
      { studentName: "Nguyễn Minh Anh", email: "bo@gmail.com" },
      { studentName: "Lê Bảo Châu", email: "cha@gmail.com" },
    ]);
  });
});
