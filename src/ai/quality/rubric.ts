import type { RuleId } from "@/core/guardrails";

/**
 * Tiêu chí đánh giá đầu ra của AI. Đây là "khuôn" duy nhất ràng buộc AI: không có mẫu cố định hay nội dung soạn sẵn,
 * AI tự quyết định nội dung và cách triển khai, nhưng đầu ra phải ĐẠT các tiêu chí dưới đây.
 * Cùng một danh sách tiêu chí được dùng cho (1) prompt sinh, (2) bộ chấm, (3) phản hồi khi yêu cầu AI sửa lại.
 */
export type Severity = "blocking" | "advisory";

export interface Criterion<T, C> {
  /** Mã ngắn ổn định, dùng trong phản hồi và log */
  id: string;
  /** Luật nghiệp vụ gốc (nếu có) */
  rule?: RuleId;
  /** Mô tả tiêu chí: viết như yêu cầu chất lượng, không phải mẫu nội dung */
  description: string;
  /**
   * blocking: vi phạm luật an toàn/pháp lý/ngôn ngữ – còn vi phạm sau các vòng sửa thì chặn phê duyệt/gửi.
   * advisory: tiêu chí chất lượng – AI phải cố đạt, còn sót thì báo để người lớn xem lại.
   */
  severity: Severity;
  /** Kiểm tra tất định. Trả về các vấn đề cụ thể (rỗng = đạt). */
  check?: (output: T, ctx: C) => string[];
  /** Tiêu chí định tính do mô hình chấm độc lập đánh giá. */
  judged?: boolean;
}

export interface Rubric<T, C> {
  name: string;
  /** Mô tả loại đầu ra cho bộ chấm */
  subject: string;
  criteria: Criterion<T, C>[];
}

export interface Finding {
  criterionId: string;
  rule?: RuleId;
  severity: Severity;
  issues: string[];
}

export interface Review {
  /** true khi không còn vi phạm blocking */
  passed: boolean;
  findings: Finding[];
  /** Số lần AI sinh (1 = đạt ngay lần đầu) */
  rounds: number;
  /** false nếu bộ chấm định tính không chạy được (chỉ có kiểm tra tất định) */
  judged: boolean;
}

export const blockingFindings = (review: Pick<Review, "findings">) => review.findings.filter((f) => f.severity === "blocking");

/** Khối tiêu chí đưa vào prompt sinh: AI biết trước mình sẽ bị chấm theo gì. */
export function formatCriteria<T, C>(rubric: Rubric<T, C>): string {
  const line = (c: Criterion<T, C>) => `- [${c.id}] ${c.description}`;
  const must = rubric.criteria.filter((c) => c.severity === "blocking");
  const quality = rubric.criteria.filter((c) => c.severity === "advisory");
  return [
    "Đầu ra sẽ được chấm độc lập theo các tiêu chí dưới đây; chưa đạt sẽ phải làm lại. Bạn tự do chọn nội dung, cách triển khai và cấu trúc câu chuyện miễn là đạt tiêu chí.",
    must.length ? `BẮT BUỘC (an toàn, pháp lý, ngôn ngữ):\n${must.map(line).join("\n")}` : "",
    quality.length ? `CHẤT LƯỢNG:\n${quality.map(line).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Phản hồi cho vòng sửa: chỉ nêu tiêu chí chưa đạt và vấn đề cụ thể, không áp đặt nội dung thay thế. */
export function formatFeedback(previous: unknown, findings: Finding[]): string {
  return [
    "Bản trước của bạn CHƯA ĐẠT các tiêu chí sau. Hãy viết lại toàn bộ đầu ra để khắc phục đúng các vấn đề này, giữ những điểm đã tốt:",
    ...findings.map((f) => `- [${f.criterionId}]${f.severity === "blocking" ? " (BẮT BUỘC)" : ""} ${f.issues.join("; ")}`),
    "",
    "BẢN TRƯỚC:",
    JSON.stringify(previous, null, 2),
  ].join("\n");
}
