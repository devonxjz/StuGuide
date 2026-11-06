import { composePrompt } from "../prompt-composer";
import { fenceUntrusted, UNTRUSTED_RULE } from "./_shared/untrusted";
import { systemIdentity } from "./_shared/system-identity";
import { languageRules } from "./_shared/language-rules";

export interface EmailStudentInput {
  id: string;
  name: string;
  /** good: cô khen; concern: cô thấy bất thường/cần phối hợp; none: cô không ghi chú riêng */
  kind: "good" | "concern" | "none";
  note?: string;
}

export interface ParentEmailPromptArgs {
  teacherName: string;
  className: string;
  /** Ngày buổi học, đã định dạng dd/mm/yyyy */
  dateLabel: string;
  lesson?: { gameName: string; objectives: string[] };
  /** Lời cô dặn chung cho cả lớp (nếu có) */
  overallNote?: string;
  students: EmailStudentInput[];
}

export function composeParentEmailPrompt(args: ParentEmailPromptArgs): string {
  const lesson = args.lesson
    ? `Bài học: "${args.lesson.gameName}"\nMục tiêu:\n${args.lesson.objectives.map((o) => `- ${o}`).join("\n")}`
    : "Cô không nêu bài học cụ thể; chỉ viết về sinh hoạt chung của lớp trong ngày.";

  const students = args.students
    .map((s) =>
      [
        `studentId: ${s.id}`,
        `Tên bé: ${s.name}`,
        s.kind === "none" ? "Ghi chú của cô: (không có – chỉ cập nhật chung, KHÔNG bịa thêm chi tiết về bé)" : `Loại ghi chú: ${s.kind === "good" ? "bé làm tốt / đáng khen" : "điều cô thấy cần quan tâm hoặc cần phụ huynh phối hợp"}`,
        s.note ? fenceUntrusted(`ghi chú của cô về bé ${s.name}`, s.note) : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n---\n\n");

  return composePrompt([
    [null, systemIdentity],
    [null, languageRules],
    [null, UNTRUSTED_RULE],
    [
      "NHIỆM VỤ",
      [
        `Viết thư điện tử thay ${args.teacherName} (giáo viên ${args.className}) gửi phụ huynh về sinh hoạt của bé trong ngày ${args.dateLabel}. Mỗi bé MỘT thư riêng, gửi riêng cho phụ huynh của bé đó.`,
        "- Tiêu đề rõ ràng, đầy đủ, có lớp, ngày và tên bé. Ví dụ: \"[Lớp MG nhỡ B1] Thông tin buổi học 06/11/2026 của bé Trần Gia Huy\".",
        "- Thư chữ thuần (không HTML, không markdown, không emoji). Mở đầu \"Kính gửi phụ huynh bé <tên>,\", thân thư 2–4 đoạn ngắn, kết bằng lời cảm ơn và chữ ký của cô.",
        "- Chỉ dùng những gì cô đã ghi chú và thông tin bài học bên dưới. KHÔNG bịa thêm sự việc, con số, tên bạn, hay chi tiết nào cô chưa nói.",
        "- Bé làm tốt: nêu cụ thể điều bé làm được và khen chân thành.",
        "- Điều cần quan tâm: mô tả khách quan hành vi cô quan sát, giọng nhẹ nhàng và tin tưởng; đề xuất 1–2 việc nhỏ phụ huynh có thể làm cùng con ở nhà; mời phụ huynh trao đổi thêm với cô. Tuyệt đối không chẩn đoán, không dán nhãn, không kết luận về tính cách hay sức khỏe của bé.",
        "- Bé không có ghi chú riêng: viết cập nhật ngắn về hoạt động chung của lớp, giọng tích cực, không thêm nhận xét riêng về bé.",
        "- Mỗi thư CHỈ nói về bé của thư đó. Tuyệt đối không nhắc tên hay hành vi của bé khác, không so sánh các bé với nhau.",
        "- Tạo đúng một thư cho mỗi studentId, giữ nguyên studentId trong kết quả.",
      ].join("\n"),
    ],
    ["BUỔI HỌC", lesson],
    ["LỜI DẶN CHUNG CỦA CÔ", args.overallNote ? fenceUntrusted("lời dặn chung của cô", args.overallNote) : "Không có."],
    ["DANH SÁCH BÉ CẦN SOẠN THƯ", students],
  ]);
}
