/**
 * Bộ đọc markdown tối giản cho câu trả lời của AI: chỉ hỗ trợ những gì AI hay dùng trong chat
 * (đoạn văn, xuống dòng, danh sách, tiêu đề, đường kẻ, **đậm**, *nghiêng*, `code`).
 * Trả về cây dữ liệu thuần để React render, không sinh HTML thô nên không có nguy cơ XSS.
 *
 * Khác markdown chuẩn ở hai điểm có chủ ý, cho hợp cách AI viết trong chat:
 *  - xuống dòng đơn được giữ nguyên (AI viết mô tả từng dòng dưới mỗi ý);
 *  - các mục "1. …", dòng trống, "2. …" vẫn là MỘT danh sách.
 */

// ── 1. Kiểu dữ liệu ─────────────────────────────────────────────────────────

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "code"; text: string };

/** Một dòng hiển thị; các dòng trong cùng khối được ngắt bằng xuống dòng. */
export type Line = Inline[];

export type Block =
  | { type: "paragraph"; lines: Line[] }
  | { type: "heading"; line: Line }
  | { type: "list"; ordered: boolean; start: number; items: Line[][] }
  | { type: "rule" };

// ── 2. Inline: đậm, nghiêng, code ───────────────────────────────────────────

/** Ưu tiên: `code` (giữ nguyên nội dung) → **đậm** → *nghiêng* (dấu * phải sát chữ để không nhầm phép nhân "5 * 3"). */
const INLINE = /`([^`]+)`|\*\*(.+?)\*\*|\*(?=\S)(.+?)(?<=\S)\*/g;

/** Dấu ** còn lẻ (AI đang stream, chưa kịp đóng) thì ẩn đi thay vì hiện nguyên ký hiệu. */
function plain(value: string): Inline[] {
  const cleaned = value.replace(/\*\*/g, "");
  return cleaned ? [{ type: "text", text: cleaned }] : [];
}

export function parseInline(source: string): Inline[] {
  const result: Inline[] = [];
  let cursor = 0;
  for (const match of source.matchAll(INLINE)) {
    const [whole, code, strong, em] = match;
    result.push(...plain(source.slice(cursor, match.index)));
    if (code !== undefined) result.push({ type: "code", text: code });
    else if (strong !== undefined) result.push({ type: "strong", children: parseInline(strong) });
    else result.push({ type: "em", children: parseInline(em) });
    cursor = match.index + whole.length;
  }
  result.push(...plain(source.slice(cursor)));
  return result;
}

// ── 3. Khối: tiêu đề, đường kẻ, danh sách, đoạn văn ─────────────────────────

const HEADING = /^#{1,6}\s+(.*)$/;
const RULE = /^(?:-{3,}|\*{3,}|_{3,})$/;
const NUMBERED = /^(\d{1,3})[.)]\s+(.*)$/;
const BULLET = /^[-*+•]\s+(.*)$/;
const INDENTED = /^\s{2,}/;

function parseListItem(line: string): { ordered: boolean; start: number; content: string } | null {
  const numbered = NUMBERED.exec(line);
  if (numbered) return { ordered: true, start: Number(numbered[1]), content: numbered[2] };
  const bullet = BULLET.exec(line);
  return bullet ? { ordered: false, start: 1, content: bullet[1] } : null;
}

/**
 * Thêm một dòng (không rỗng) vào cuối danh sách khối.
 * `afterBlank`: ngay trước nó là dòng trống, nên khối đang mở đã đóng – trừ khi dòng là mục kế tiếp của danh sách,
 * hoặc thụt lề (phần mô tả của mục danh sách).
 */
function addLine(blocks: Block[], raw: string, afterBlank: boolean) {
  const line = raw.trim();
  const last = blocks.at(-1);

  const heading = HEADING.exec(line);
  if (heading) {
    blocks.push({ type: "heading", line: parseInline(heading[1]) });
    return;
  }
  if (RULE.test(line)) {
    blocks.push({ type: "rule" });
    return;
  }

  const item = parseListItem(line);
  if (item) {
    if (last?.type === "list" && last.ordered === item.ordered) last.items.push([parseInline(item.content)]);
    else blocks.push({ type: "list", ordered: item.ordered, start: item.start, items: [[parseInline(item.content)]] });
    return;
  }

  const content = parseInline(line);
  if (last?.type === "list" && (!afterBlank || INDENTED.test(raw))) last.items.at(-1)!.push(content);
  else if (last?.type === "paragraph" && !afterBlank) last.lines.push(content);
  else blocks.push({ type: "paragraph", lines: [content] });
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let afterBlank = false;
  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    if (!raw.trim()) {
      afterBlank = true;
      continue;
    }
    addLine(blocks, raw, afterBlank);
    afterBlank = false;
  }
  return blocks;
}
