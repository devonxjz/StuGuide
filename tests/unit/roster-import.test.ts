import { describe, it, expect } from "vitest";
import { parseBirthDate, parseCsv, rosterFromCsv, ROSTER_TEMPLATE_CSV } from "@/core/roster-import";

describe("parseBirthDate", () => {
  it("nhận dd/mm/yyyy và yyyy-mm-dd, từ chối ngày không có thật", () => {
    expect(parseBirthDate("10/03/2021")).toBe("2021-03-10");
    expect(parseBirthDate("5-7-2021")).toBe("2021-07-05");
    expect(parseBirthDate("2021-3-5")).toBe("2021-03-05");
    expect(parseBirthDate("31/02/2021")).toBeUndefined();
    expect(parseBirthDate("hôm qua")).toBeUndefined();
  });
});

describe("parseCsv", () => {
  it("tự nhận dấu chấm phẩy, ô trong ngoặc kép và BOM", () => {
    expect(parseCsv('﻿a;b\n"x;y";"z ""q"""\n\n')).toEqual([["a", "b"], ["x;y", 'z "q"']]);
  });
});

describe("rosterFromCsv", () => {
  it("đọc tệp mẫu", () => {
    const { rows, problems } = rosterFromCsv(ROSTER_TEMPLATE_CSV);
    expect(problems).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ studentName: "Trần Gia Huy", dateOfBirth: "2021-03-10", gender: "Nam", parentPhone: "0901234567", parentEmail: "mai.tran@example.com" });
    expect(rows[1].parentEmail).toBeUndefined();
  });

  it("nhận tiêu đề khác thứ tự, có/không dấu", () => {
    const { rows } = rosterFromCsv("SDT,Phu huynh,Giới tính,Ngày sinh,Tên bé\n090 123 4567,Mai,nữ,1/2/2021,An");
    expect(rows).toEqual([{ studentName: "An", dateOfBirth: "2021-02-01", gender: "Nữ", parentName: "Mai", parentPhone: "0901234567" }]);
  });

  it("không có tiêu đề thì hiểu theo thứ tự cột chuẩn", () => {
    expect(rosterFromCsv("An,01/02/2021,Nam,Mai").rows).toHaveLength(1);
  });

  it("dòng lỗi vào problems, dòng tốt vẫn được giữ", () => {
    const { rows, problems } = rosterFromCsv(
      ["Họ tên bé,Ngày sinh,Giới tính,Họ tên phụ huynh,Số điện thoại,Email", "An,01/02/2021,Nam,Mai,,", "Bình,32/01/2021,Nam,Lan,,", "Chi,01/02/2021,?,Lan,,", "Dũng,01/02/2021,Nam,,,", "Em,01/02/2021,Nữ,Hoa,12,", "Phúc,01/02/2021,Nam,Hoa,,sai"].join("\n"),
    );
    expect(rows.map((r) => r.studentName)).toEqual(["An"]);
    expect(problems).toHaveLength(5);
    expect(problems[0]).toContain("Dòng 3");
  });

  it("báo thiếu cột bắt buộc", () => {
    expect(rosterFromCsv("Họ tên bé,Email\nAn,a@b.vn").problems[0]).toContain("Ngày sinh");
  });
});
