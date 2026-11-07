/**
 * Đọc danh sách lớp (học sinh + phụ huynh) từ bảng CSV/Excel mà giáo viên gửi lên. Hàm thuần, không phụ thuộc DB hay trình duyệt.
 * Cột nhận theo tên tiêu đề (không phân biệt hoa thường, dấu); không có tiêu đề thì hiểu theo thứ tự của ROSTER_TEMPLATE_HEADER.
 */

export interface RosterRow {
  studentName: string;
  /** yyyy-mm-dd */
  dateOfBirth: string;
  gender: "Nam" | "Nữ";
  parentName: string;
  parentPhone?: string;
  parentEmail?: string;
}

export interface RosterParseResult {
  rows: RosterRow[];
  /** Mỗi mục là một dòng bị bỏ qua kèm lý do, để cô sửa file */
  problems: string[];
}

export const ROSTER_TEMPLATE_HEADER = ["Họ tên bé", "Ngày sinh", "Giới tính", "Họ tên phụ huynh", "Số điện thoại", "Email"] as const;
export const ROSTER_MAX_ROWS = 200;

const FIELDS = ["studentName", "dateOfBirth", "gender", "parentName", "parentPhone", "parentEmail"] as const;
type Field = (typeof FIELDS)[number];

/** Bỏ dấu, chữ thường, chỉ giữ chữ-số: "Họ tên bé" → "hotenbe". */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const HEADER_ALIASES: Record<Field, string[]> = {
  studentName: ["hotenbe", "tenbe", "hoten", "hocsinh", "hotenhocsinh", "tenhocsinh", "be", "student"],
  dateOfBirth: ["ngaysinh", "ngaythangnamsinh", "sinhnhat", "dob", "birthday"],
  gender: ["gioitinh", "gioi", "gender"],
  parentName: ["hotenphuhuynh", "tenphuhuynh", "phuhuynh", "bome", "nguoigiamho", "parent"],
  parentPhone: ["sodienthoai", "dienthoai", "sdt", "sodt", "phone"],
  parentEmail: ["email", "mail", "thudientu"],
};

const headerToField = (cell: string): Field | undefined => {
  const key = fold(cell);
  return FIELDS.find((f) => HEADER_ALIASES[f].includes(key));
};

/** Tách CSV: hỗ trợ ô đặt trong ngoặc kép (chứa dấu phân cách, xuống dòng, "" là một dấu "), tự nhận dấu phẩy / chấm phẩy / tab. */
export function parseCsv(raw: string): string[][] {
  const text = raw.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const delimiter = [";", "\t", ","].reduce((best, ch) => (count(ch) > count(best) ? ch : best), ",");

  const table: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const endCell = () => {
    row.push(cell.trim());
    cell = "";
  };
  const endRow = () => {
    endCell();
    if (row.some(Boolean)) table.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) endCell();
    else if (ch === "\n") endRow();
    else if (ch !== "\r") cell += ch;
  }
  endRow();
  return table;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Nhận dd/mm/yyyy (kiểu Việt Nam), d-m-yyyy, yyyy-mm-dd. Ngày không có thật (31/02) → undefined. */
export function parseBirthDate(raw: string): string | undefined {
  const s = raw.trim();
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s) ?? /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (!m) return undefined;
  const iso = m[1].length === 4;
  const [year, month, day] = iso ? [+m[1], +m[2], +m[3]] : [+m[3], +m[2], +m[1]];
  const d = new Date(Date.UTC(year, month - 1, day));
  const real = d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
  return real ? `${year}-${pad(month)}-${pad(day)}` : undefined;
}

const parseGender = (raw: string): RosterRow["gender"] | undefined => {
  const g = fold(raw);
  if (["nam", "trai", "be trai", "male", "m"].map(fold).includes(g)) return "Nam";
  if (["nu", "gai", "be gai", "female", "f"].map(fold).includes(g)) return "Nữ";
  return undefined;
};

/** Giữ chữ số và dấu + đầu; bỏ khoảng trắng, chấm, gạch. Quá ngắn/dài thì coi là sai. */
export function normalizePhone(raw: string): string | undefined {
  const digits = raw.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  const count = digits.replace(/\D/g, "").length;
  return count >= 8 && count <= 15 ? digits : undefined;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Chuyển bảng ô (từ CSV hoặc Excel) thành danh sách hợp lệ; dòng lỗi đi vào `problems` thay vì làm hỏng cả file. */
export function rosterFromTable(table: string[][]): RosterParseResult {
  const result: RosterParseResult = { rows: [], problems: [] };
  if (!table.length) return result;

  const detected = table[0].map(headerToField);
  const hasHeader = detected.includes("studentName");
  const columns: (Field | undefined)[] = hasHeader ? detected : FIELDS.slice(0, table[0].length);
  const body = hasHeader ? table.slice(1) : table;
  const firstLineNo = hasHeader ? 2 : 1;

  if (hasHeader && !columns.includes("dateOfBirth")) {
    result.problems.push('Thiếu cột "Ngày sinh"');
    return result;
  }
  if (hasHeader && !columns.includes("parentName")) {
    result.problems.push('Thiếu cột "Họ tên phụ huynh"');
    return result;
  }

  body.slice(0, ROSTER_MAX_ROWS + 50).forEach((cells, index) => {
    const at = (f: Field) => cells[columns.indexOf(f)]?.trim() ?? "";
    const line = `Dòng ${firstLineNo + index}`;
    const studentName = at("studentName");
    if (!studentName) return result.problems.push(`${line}: thiếu họ tên bé`);

    const dateOfBirth = parseBirthDate(at("dateOfBirth"));
    if (!dateOfBirth) return result.problems.push(`${line} (${studentName}): ngày sinh "${at("dateOfBirth")}" không hợp lệ, cần dạng dd/mm/yyyy`);
    const gender = parseGender(at("gender"));
    if (!gender) return result.problems.push(`${line} (${studentName}): giới tính "${at("gender")}" không hợp lệ, cần Nam hoặc Nữ`);
    const parentName = at("parentName");
    if (!parentName) return result.problems.push(`${line} (${studentName}): thiếu họ tên phụ huynh`);

    const phoneRaw = at("parentPhone");
    const parentPhone = phoneRaw ? normalizePhone(phoneRaw) : undefined;
    if (phoneRaw && !parentPhone) return result.problems.push(`${line} (${studentName}): số điện thoại "${phoneRaw}" không hợp lệ`);
    const emailRaw = at("parentEmail").toLowerCase();
    if (emailRaw && !EMAIL.test(emailRaw)) return result.problems.push(`${line} (${studentName}): email "${emailRaw}" không hợp lệ`);

    result.rows.push({ studentName, dateOfBirth, gender, parentName, ...(parentPhone && { parentPhone }), ...(emailRaw && { parentEmail: emailRaw }) });
  });

  if (body.length > ROSTER_MAX_ROWS) result.problems.push(`Tối đa ${ROSTER_MAX_ROWS} bé mỗi lớp; các dòng sau đó đã bị bỏ qua`);
  result.rows = result.rows.slice(0, ROSTER_MAX_ROWS);
  return result;
}

export const rosterFromCsv = (raw: string) => rosterFromTable(parseCsv(raw));

/** Tệp mẫu để cô tải về điền (UTF-8 có BOM để Excel đọc đúng tiếng Việt). */
export const ROSTER_TEMPLATE_CSV = `﻿${[
  ROSTER_TEMPLATE_HEADER.join(","),
  "Trần Gia Huy,10/03/2021,Nam,Trần Thị Mai,0901234567,mai.tran@example.com",
  "Nguyễn Minh Anh,22/07/2021,Nữ,Nguyễn Văn Hải,0912345678,",
].join("\r\n")}\r\n`;
