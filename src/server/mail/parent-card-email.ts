import type { ParentCardContent } from "@/core/schemas/parent-card.schema";

export interface ParentCardEmailInput {
  content: ParentCardContent;
  gameName: string | null;
  className: string;
  teacherName: string;
  studentName: string;
  /** Nhận xét riêng của cô về bé (từ hồ sơ minh chứng); không có thì không hiện khối này. */
  teacherNote?: string | null;
  /** Link riêng của bé (tuyệt đối); không có thì bỏ nút. */
  url?: string;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const paragraphs = (s: string) => escapeHtml(s).replace(/\r?\n/g, "<br>");

/** Thư thẻ nhiệm vụ: bản HTML có bố cục (CSS nội tuyến để Gmail hiển thị đúng) kèm bản chữ thuần dự phòng. */
export function renderParentCardEmail(i: ParentCardEmailInput): { subject: string; html: string; text: string } {
  const { content: c } = i;
  const note = i.teacherNote?.trim();
  const subject = oneLine(`${i.className ? `${i.className} · ` : ""}Thẻ nhiệm vụ ${c.duration} phút cho bé ${i.studentName}`);

  const text = [
    c.greeting,
    "",
    c.classSummary,
    "",
    `${c.missionTitle} (${c.duration} phút):`,
    ...c.eqQuestions.map((q, n) => `${n + 1}. ${q}`),
    "",
    c.adultRole,
    ...(note ? ["", `Nhận xét của cô về bé ${i.studentName}:`, note] : []),
    ...(i.url ? ["", `Xem thẻ và phản hồi cho cô: ${i.url}`] : []),
    "",
    `Trân trọng,\nCô ${i.teacherName}`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="vi"><body style="margin:0;background:#f4f6fb;padding:24px 12px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
<tr><td style="background:#4f46e5;padding:20px 28px;color:#ffffff;">
<div style="font-size:13px;opacity:.85;">${escapeHtml(i.className)}${i.gameName ? ` · ${escapeHtml(i.gameName)}` : ""}</div>
<div style="font-size:20px;font-weight:700;margin-top:4px;">Thẻ nhiệm vụ ${c.duration} phút cho bé ${escapeHtml(i.studentName)}</div>
</td></tr>
<tr><td style="padding:24px 28px;font-size:15px;line-height:1.65;">
<p style="margin:0 0 12px;color:#6b7280;">${paragraphs(c.greeting)}</p>
<p style="margin:0 0 20px;">${paragraphs(c.classSummary)}</p>
<div style="background:#f3e8ff;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
<div style="font-weight:700;color:#6d28d9;margin-bottom:8px;">${escapeHtml(c.missionTitle)}</div>
<ol style="margin:0;padding-left:20px;">${c.eqQuestions.map((q) => `<li style="margin-bottom:6px;">${paragraphs(q)}</li>`).join("")}</ol>
<p style="margin:12px 0 0;color:#6d28d9;">${paragraphs(c.adultRole)}</p>
</div>${
    note
      ? `
<div style="background:#fff7ed;border-left:4px solid #f59e0b;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
<div style="font-weight:700;color:#b45309;margin-bottom:4px;">Nhận xét của cô về bé ${escapeHtml(i.studentName)}</div>
<div>${paragraphs(note)}</div>
</div>`
      : ""
  }${
    i.url
      ? `
<p style="text-align:center;margin:24px 0 8px;"><a href="${escapeHtml(i.url)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px;">Xem thẻ &amp; phản hồi cho cô</a></p>`
      : ""
  }
<p style="margin:24px 0 0;">Trân trọng,<br><b>Cô ${escapeHtml(i.teacherName)}</b></p>
</td></tr>
<tr><td style="background:#f9fafb;padding:14px 28px;font-size:12px;color:#9ca3af;text-align:center;">Thư được gửi qua StuGuide thay cô ${escapeHtml(i.teacherName)}. Phụ huynh có thể trả lời trực tiếp thư này.</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html, text };
}
