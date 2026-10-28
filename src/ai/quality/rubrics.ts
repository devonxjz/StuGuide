import { checkLanguage, checkSafetyCoverage, checkScreenFree, requiredSafetyCoverage, verifyCitation } from "@/core/guardrails";
import type { LessonPlanOutput } from "@/core/schemas/lesson-plan.schema";
import type { ParentCardContent } from "@/core/schemas/parent-card.schema";
import type { HomeActivity } from "@/core/schemas/family.schema";
import type { BehaviorAnalysisOutput } from "@/core/schemas/assessment.schema";
import type { Criterion, Rubric } from "./rubric";

/** Gom mọi chuỗi trong một giá trị (để kiểm tra ngôn ngữ trên toàn bộ đầu ra). */
export function collectStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collectStrings(x, out));
  return out;
}

const fold = (s: string) => s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();

const languageCriterion = <T, C>(): Criterion<T, C> => ({
  id: "ngon-ngu-trung-lap",
  rule: "BR-004",
  severity: "blocking",
  description: "Mô tả trẻ khách quan, trung lập, tích cực; không dùng từ chẩn đoán hay dán nhãn (tự kỷ, tăng động, chậm phát triển, yếu kém, rối loạn…).",
  check: (o) => checkLanguage(collectStrings(o).join("\n")).violations,
});

const screenFreeCriterion = <T, C>(pick: (o: T) => string[]): Criterion<T, C> => ({
  id: "screen-free",
  rule: "BR-005",
  severity: "blocking",
  description: "100% người thật, việc thật, đồ dùng thật: hoạt động của trẻ không dùng màn hình, video, điện thoại hay ứng dụng.",
  check: (o) => checkScreenFree(pick(o).join("\n")).violations,
});

// ───────────────────────── Giáo án ─────────────────────────

export interface LessonPlanContext {
  ageGroup: string;
  materials: string[];
  duration: number;
  /** Tên trò chơi lớp đã dùng gần đây (để tên mới không trùng) */
  recentGameNames: string[];
}

const childFacing = (p: LessonPlanOutput) => [
  p.gameName,
  ...p.objectives,
  p.teacherScript,
  ...p.preparation,
  ...p.procedure.map((s) => `${s.title}. ${s.instructions}. ${s.teacherTip}`),
  ...p.flashcards.map((f) => f.text),
  ...p.observationCriteria,
  ...p.eqQuestions,
];

const lessonPlanCriteria: Criterion<LessonPlanOutput, LessonPlanContext>[] = [
  languageCriterion(),
  screenFreeCriterion(childFacing),
  {
    id: "an-toan-vat-lieu",
    rule: "BR-002",
    severity: "blocking",
    description: "Cảnh báo an toàn theo Thông tư 45 bao phủ từng rủi ro của vật liệu với đúng độ tuổi (vật nhỏ gây hóc với trẻ dưới 4 tuổi, mép sắc của đồ tái chế, nam châm, pin cúc áo, bóng bay, dây dài, hạt nở, dị ứng, vật nóng…), mức cảnh báo tương xứng mức rủi ro.",
    check: (p, ctx) => checkSafetyCoverage(p.safetyWarnings, ctx.materials, ctx.ageGroup),
  },
  {
    id: "can-cu-phap-ly",
    rule: "BR-003",
    severity: "blocking",
    description: "Chỉ trích dẫn số hiệu văn bản có trong phần căn cứ đã tra cứu; không có căn cứ phù hợp thì để isVerified = false, không bịa số hiệu.",
    check: (p) => (p.legalReference.isVerified && !verifyCitation(p.legalReference).isVerified ? [`Số hiệu "${p.legalReference.documentCode}" không có trong kho tri thức`] : []),
  },
  {
    id: "an-toan-hoat-dong",
    severity: "advisory",
    judged: true,
    description: "Cảnh báo an toàn bao quát cả rủi ro của chính hoạt động và không gian (va chạm khi chạy, trơn trượt, chen lấn…), cụ thể để cô làm theo được.",
  },
  {
    id: "thoi-luong",
    severity: "advisory",
    description: "Tổng thời lượng các bước khớp thời lượng cô yêu cầu (lệch không quá khoảng 25%).",
    check: (p, ctx) => {
      const total = p.procedure.reduce((n, s) => n + (Number.isFinite(s.duration) ? s.duration : 0), 0);
      return Math.abs(total - ctx.duration) > ctx.duration * 0.25 ? [`Tổng các bước là ${total} phút, cô yêu cầu ${ctx.duration} phút`] : [];
    },
  },
  {
    id: "nhip-hoat-dong",
    severity: "advisory",
    description: "Có phần khởi động, hoạt động chính và kết thúc/thư giãn, trình tự hợp lý để trẻ vào cuộc rồi lắng lại.",
    check: (p) => {
      const phases = new Set(p.procedure.map((s) => s.phase));
      const missing = (["warmup", "main", "cooldown"] as const).filter((x) => !phases.has(x));
      const label = { warmup: "khởi động", main: "hoạt động chính", cooldown: "kết thúc" };
      return missing.length ? [`Thiếu phần: ${missing.map((m) => label[m]).join(", ")}`] : [];
    },
  },
  {
    id: "ten-rieng",
    severity: "advisory",
    description: "Tên trò chơi gợi hình, riêng cho bài này và khác các tên lớp đã dùng gần đây.",
    check: (p, ctx) => (ctx.recentGameNames.some((n) => fold(n) === fold(p.gameName)) ? [`Tên "${p.gameName}" trùng với trò chơi lớp đã dùng`] : []),
  },
  {
    id: "flashcard-minh-hoa",
    severity: "advisory",
    description: "Mỗi flashcard có nội dung rõ ràng và một emoji minh họa đúng nội dung để in, tô màu cùng trẻ.",
    check: (p) => (p.flashcards.some((f) => !f.emoji.trim()) ? ["Có flashcard chưa có emoji minh họa"] : []),
  },
  {
    id: "hoc-lieu-san-co",
    severity: "advisory",
    judged: true,
    description: "Lấy học liệu cô có sẵn làm chất liệu chính; mỗi đồ vật có vai trò rõ ràng và được biến hóa sáng tạo trong trò chơi (không chỉ gọi tên trần trụi).",
  },
  {
    id: "dong-luc-nhap-vai",
    severity: "advisory",
    judged: true,
    description: "Có bối cảnh hoặc nhiệm vụ nhập vai khiến trẻ háo hức tham gia; cách xây dựng câu chuyện do người soạn tự chọn cho hợp chủ đề và độ tuổi, không lặp một khuôn quen thuộc.",
  },
  {
    id: "vua-suc",
    severity: "advisory",
    judged: true,
    description: "Yêu cầu vận động, ngôn ngữ, nhận thức vừa sức nhóm tuổi; luật chơi đủ đơn giản để trẻ hiểu ngay.",
  },
  {
    id: "muc-tieu",
    severity: "advisory",
    judged: true,
    description: "Mục tiêu cụ thể, quan sát được, đúng mảng phát triển trọng tâm và nhất quán với căn cứ pháp lý đã nêu.",
  },
  {
    id: "loi-dan",
    severity: "advisory",
    judged: true,
    description: "Lời dẫn ấm áp, tự nhiên, cô đọc được ngay khi tổ chức; gợi trí tưởng tượng thay vì giảng giải.",
  },
  {
    id: "tieu-chi-quan-sat",
    severity: "advisory",
    judged: true,
    description: "Tiêu chí quan sát là hành vi cụ thể nhìn thấy được trong buổi chơi, không phán xét, gắn với mục tiêu.",
  },
  {
    id: "cau-hoi-eq",
    severity: "advisory",
    judged: true,
    description: "Câu hỏi EQ mở, không có đúng/sai, gợi trẻ kể lại cảm xúc và trải nghiệm của chính mình.",
  },
  {
    id: "dung-yeu-cau",
    severity: "advisory",
    judged: true,
    description: "Phản ánh đúng chủ đề, mảng phát triển, lựa chọn STEM/dân gian, lưu ý của cô và những điều đã biết về lớp trong bối cảnh.",
  },
];

export const lessonPlanRubric: Rubric<LessonPlanOutput, LessonPlanContext> = {
  name: "lesson-plan",
  subject: "một kế hoạch trò chơi học tập mầm non",
  criteria: lessonPlanCriteria,
};

/** Viết lại một phần: chấm trên toàn bộ giáo án sau khi ghép phần mới (luật an toàn áp cho cả bài), thêm tiêu chí đúng góp ý. */
export const sectionRewriteRubric: Rubric<LessonPlanOutput, LessonPlanContext> = {
  name: "section-rewrite",
  subject: "một giáo án mầm non vừa được viết lại MỘT phần theo góp ý của cô giáo",
  criteria: [
    ...lessonPlanCriteria.filter((c) => c.severity === "blocking" || ["thoi-luong", "nhip-hoat-dong", "loi-dan", "muc-tieu", "an-toan-hoat-dong"].includes(c.id)),
    {
      id: "dung-gop-y",
      severity: "advisory",
      judged: true,
      description: "Phần được viết lại thay đổi đúng theo góp ý của cô và vẫn ăn khớp với các phần còn lại của giáo án.",
    },
  ],
};

// ───────────────────────── Checklist quan sát ─────────────────────────

export const checklistRubric: Rubric<string[], { objectives: string[] }> = {
  name: "checklist",
  subject: "danh sách tiêu chí quan sát cuối ngày cho một bài học mầm non",
  criteria: [
    languageCriterion(),
    {
      id: "so-luong",
      severity: "advisory",
      description: "Từ 3 đến 5 tiêu chí, không trùng lặp nhau.",
      check: (items) => {
        const issues: string[] = [];
        if (items.length < 3 || items.length > 5) issues.push(`Có ${items.length} tiêu chí`);
        if (new Set(items.map(fold)).size !== items.length) issues.push("Có tiêu chí trùng nhau");
        return issues;
      },
    },
    { id: "quan-sat-duoc", severity: "advisory", judged: true, description: "Mỗi tiêu chí là MỘT hành vi cụ thể cô nhìn thấy được trong buổi chơi, ngắn gọn, tích chọn nhanh được." },
    { id: "khong-phan-xet", severity: "advisory", judged: true, description: "Diễn đạt trung lập, tích cực, không so sánh hay phán xét trẻ." },
    { id: "bam-muc-tieu", severity: "advisory", judged: true, description: "Mỗi tiêu chí gắn với ít nhất một mục tiêu của bài học." },
  ],
};

// ───────────────────────── Thẻ phụ huynh ─────────────────────────

export const parentCardRubric: Rubric<ParentCardContent, void> = {
  name: "parent-card",
  subject: "một thẻ nhiệm vụ ngắn cô giáo gửi phụ huynh sau bài học",
  criteria: [
    languageCriterion(),
    screenFreeCriterion((c) => [c.greeting, c.classSummary, c.missionTitle, c.adultRole, ...c.eqQuestions]),
    { id: "dung-bai-hoc", severity: "advisory", judged: true, description: "Tóm tắt đúng những gì lớp đã làm trong bài học, tích cực, không bịa hoạt động không có." },
    { id: "khong-danh-gia-rieng", severity: "advisory", judged: true, description: "Viết chung cho cả lớp: không nhắc tên, đánh giá hay so sánh riêng bé nào." },
    { id: "cau-hoi-eq", severity: "advisory", judged: true, description: "Câu hỏi mở, không có đúng/sai, gợi con kể lại cảm xúc và trải nghiệm ở lớp." },
    { id: "vai-tro-bo-me", severity: "advisory", judged: true, description: "Nói rõ vai trò của bố mẹ (lắng nghe, đồng hành, không phán xét) và làm được trong khoảng 5 phút." },
    { id: "than-thien", severity: "advisory", judged: true, description: "Ấm áp, ngắn gọn, dễ hiểu, không thuật ngữ chuyên môn." },
  ],
};

// ───────────────────────── Hoạt động ở nhà ─────────────────────────

export interface HomeActivityContext {
  ageGroup?: string;
  minutes: number;
}

export const homeActivityRubric: Rubric<HomeActivity, HomeActivityContext> = {
  name: "home-activity",
  subject: "một hoạt động ngắn ở nhà do phụ huynh dẫn dắt, cá nhân hóa cho một bé mầm non",
  criteria: [
    languageCriterion(),
    screenFreeCriterion((a) => [a.title, a.whyForThisChild, ...a.materials, ...a.steps, a.eqQuestion, a.parentTip]),
    {
      id: "an-toan-tuoi",
      rule: "BR-002",
      severity: "blocking",
      description: "Đồ vật an toàn với độ tuổi của bé: trẻ dưới 3 tuổi không dùng vật nhỏ có thể gây hóc; trẻ 3–4 tuổi dùng vật nhỏ phải có người lớn giám sát.",
      check: (a, ctx) =>
        requiredSafetyCoverage(a.materials, ctx.ageGroup ?? "")
          .filter((r) => ["small-object", "magnet", "button-battery", "expanding-bead"].includes(r.hazard))
          .filter((r) => r.minLevel === "critical" || !/giám sát|cẩn thận|để ý|trông/i.test(`${a.parentTip} ${a.steps.join(" ")}`))
          .map((r) => `"${r.material}": ${r.reason}`),
    },
    {
      id: "thoi-luong",
      severity: "advisory",
      description: "Thời lượng sát với thời gian bố mẹ có.",
      check: (a, ctx) => (Math.abs(a.minutes - ctx.minutes) > 3 ? [`Hoạt động ${a.minutes} phút, bố mẹ có khoảng ${ctx.minutes} phút`] : []),
    },
    { id: "ca-nhan-hoa", severity: "advisory", judged: true, description: "Dựa trên điều có thật trong hồ sơ của bé (sở thích, cách bé phản ứng); phần lý do chỉ nêu điều có trong hồ sơ, không bịa." },
    { id: "theo-y-bo-me", severity: "advisory", judged: true, description: "Đáp ứng điều bố mẹ muốn tập trung hoặc đồ vật bố mẹ nói đang có (nếu có)." },
    { id: "noi-bai-hoc", severity: "advisory", judged: true, description: "Nối với bài học gần đây ở lớp khi hồ sơ có thông tin đó, để việc học liền mạch giữa nhà và trường." },
    { id: "bo-me-dan-dat", severity: "advisory", judged: true, description: "Các bước viết cho bố mẹ làm cùng con: ngắn, rõ, giọng tích cực, bước nhỏ dễ thành công; dùng đồ vật phổ biến trong nhà." },
  ],
};

// ───────────────────────── Phân tích hành vi ─────────────────────────

export const behaviorRubric: Rubric<BehaviorAnalysisOutput, void> = {
  name: "behavior-analysis",
  subject: "một gợi ý quan sát sâu cho giáo viên về một bé có nhiều tuần liên tiếp cần rèn thêm",
  criteria: [
    languageCriterion(),
    { id: "khach-quan", severity: "advisory", judged: true, description: "Mô tả quy luật hành vi khách quan, chỉ dựa trên ghi chú và tiêu chí quan sát được cung cấp; không suy diễn nguyên nhân, không chẩn đoán." },
    { id: "ky-nang", severity: "advisory", judged: true, description: "skillArea gọi đúng tên nhóm kỹ năng dựa trên các tiêu chí bé còn cần rèn." },
    { id: "tro-choi-ho-tro", severity: "advisory", judged: true, description: "Đề xuất một trò chơi 1-1 hoặc theo cặp: vui, dùng đồ dùng thật, chia bước nhỏ để bé dễ thành công." },
  ],
};
