import type { AiEngine, Generated } from "@/ai/engine";
import type { Review } from "@/ai/quality/rubric";
import { sampleLessonPlan } from "../fixtures/lesson-plan";

/** Kết quả chấm "đạt ngay lần đầu" (test double không chạy vòng tiêu chí – vòng đó được test riêng ở unit/ai/quality). */
export const PASSED: Review = { passed: true, findings: [], rounds: 1, judged: true };
const ok = <T,>(value: T, review: Review = PASSED): Generated<T> => ({ value, review });

/**
 * Test double của AiEngine (chỉ dùng trong unit/integration test để kiểm tra nghiệp vụ mà không tốn API).
 * Hành vi AI thật (kể cả vòng tiêu chí với mô hình thật) được kiểm tra ở tests/live/*.
 * `overrides` cho phép từng test thay một hàm (vd. trả kết quả chấm còn vi phạm bắt buộc).
 */
export function createFakeEngine(overrides: Partial<AiEngine> = {}): AiEngine {
  const base: AiEngine = {
    async generateLessonPlan(input, _context, options) {
      options?.onStep?.("legal");
      options?.onStep?.("safety");
      options?.onStep?.("generate");
      options?.onStep?.("review");
      return ok({ ...sampleLessonPlan, gameName: `${sampleLessonPlan.gameName} (${input.materials[0]})` });
    },
    async rewriteSection({ plan, section }) {
      if (section === "gameName") return ok(`${plan.gameName} – bản mới`);
      if (section === "teacherScript") return ok(`Lời dẫn mới: ${plan.teacherScript}`);
      return ok(plan[section]);
    },
    async generateChecklist() {
      return ok(["Chủ động rủ bạn cùng chơi", "Nắm tay bạn khi di chuyển", "Chờ đến lượt"]);
    },
    async generateParentCard({ plan, teacherName, className }) {
      return ok({
        greeting: `Chào bố mẹ! ${teacherName} (${className}) xin chia sẻ.`,
        classSummary: `Hôm nay lớp chơi "${plan.gameName}".`,
        missionTitle: "5 phút trò chuyện trước giờ đi ngủ",
        duration: 5,
        eqQuestions: plan.eqQuestions.slice(0, 2),
        adultRole: "Bố mẹ chỉ cần lắng nghe.",
      });
    },
    async generateHomeActivity({ profile, focus }) {
      return ok({
        title: "Khủng long tìm trứng",
        minutes: 5,
        whyForThisChild: `Hợp với bé vì ${profile.includes("khủng long") ? "bé mê khủng long" : "bé thích khám phá"}${focus ? `; theo ý bố mẹ: ${focus}` : ""}.`,
        materials: ["Vài chiếc tất cuộn tròn làm trứng", "Một chiếc hộp giấy làm tổ"],
        steps: ["Bố mẹ giấu trứng quanh phòng", "Cùng bé đi tìm như khủng long", "Bỏ trứng vào tổ và đếm", "Kể chuyện khủng long con nở"],
        eqQuestion: "Con thích nhất lúc nào khi đi tìm trứng?",
        parentTip: "Nếu bé ngại, bố mẹ làm mẫu trước một lần.",
      });
    },
    async analyzeBehavior({ studentName, weekCount, weakCriteria }) {
      return ok({
        pattern: `Có biểu hiện ngập ngừng trong giao tiếp nhóm qua ${weekCount} tuần liên tiếp`,
        skillArea: weakCriteria[0] ? `Kỹ năng liên quan: ${weakCriteria[0]}` : "Kỹ năng giao tiếp nhóm",
        suggestedActivity: `Trò chơi "Cặp đôi tí hon" ghép ${studentName} với một bạn thân thiện.`,
      });
    },
  };
  return { ...base, ...overrides };
}
