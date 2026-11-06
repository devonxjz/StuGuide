/** Ghép tên cô gõ trong chat/CSV với danh sách bé của lớp, và chặn thư nhắc tên bé khác. Hàm thuần, không phụ thuộc DB. */

export interface NamedStudent {
  id: string;
  fullName: string;
}

const clean = (s: string) =>
  s
    .normalize("NFC")
    .toLowerCase()
    .replace(/^(bé|bạn|em)\s+/u, "")
    .replace(/\s+/g, " ")
    .trim();

const givenName = (fullName: string) => clean(fullName).split(" ").pop() ?? "";

export type NameMatch<T extends NamedStudent> = { kind: "found"; student: T } | { kind: "ambiguous"; candidates: T[] } | { kind: "missing" };

/**
 * Tên đầy đủ khớp chính xác thì lấy luôn; nếu không thì thử theo tên gọi (từ cuối) và theo cụm có trong họ tên.
 * Nhiều bé cùng khớp → "ambiguous" để hỏi lại cô thay vì đoán (gửi nhầm thư là sự cố không thu hồi được).
 */
export function matchStudentName<T extends NamedStudent>(query: string, students: T[]): NameMatch<T> {
  const q = clean(query);
  if (!q) return { kind: "missing" };
  const exact = students.filter((s) => clean(s.fullName) === q);
  if (exact.length === 1) return { kind: "found", student: exact[0] };
  if (exact.length > 1) return { kind: "ambiguous", candidates: exact };
  const partial = students.filter((s) => givenName(s.fullName) === q || ` ${clean(s.fullName)} `.includes(` ${q} `));
  if (partial.length === 1) return { kind: "found", student: partial[0] };
  if (partial.length > 1) return { kind: "ambiguous", candidates: partial };
  return { kind: "missing" };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Tên các bé KHÁC xuất hiện trong thư của một bé (họ tên đầy đủ, hoặc "bé/bạn + tên gọi").
 * Thư gửi phụ huynh bé A không được nhắc tới bé B (riêng tư, BR-006); AI hay "lỡ miệng" khi soạn cả lớp một lượt.
 */
export function findOtherStudentNames(text: string, own: NamedStudent, all: NamedStudent[]): string[] {
  const hay = text.normalize("NFC").toLowerCase();
  const ownClean = clean(own.fullName);
  return all
    .filter((s) => s.id !== own.id)
    .filter((s) => {
      const full = clean(s.fullName);
      if (full === ownClean) return false; // trùng tên với chính bé này thì không tính là bé khác
      const given = givenName(s.fullName);
      const patterns = [escapeRegExp(full), ...(given && given !== givenName(own.fullName) ? [`(?:bé|bạn|em)\\s+${escapeRegExp(given)}`] : [])];
      return patterns.some((p) => new RegExp(`(?<![\\p{L}])${p}(?![\\p{L}])`, "u").test(hay));
    })
    .map((s) => s.fullName);
}

/** Tách một dòng CSV đơn giản "tên, email" (hỗ trợ dấu phẩy, chấm phẩy, tab; bỏ dòng tiêu đề và dòng trống). */
export function parseContactLines(raw: string): { studentName: string; email: string }[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.split(/[,;\t]/).map((cell) => cell.trim().replace(/^"|"$/g, "")))
    .filter((cells) => cells.length >= 2 && cells[0] && cells[1] && cells[1].includes("@"))
    .map(([studentName, email]) => ({ studentName, email }));
}
