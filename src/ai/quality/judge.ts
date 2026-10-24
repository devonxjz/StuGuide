import { z } from "zod";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { UNTRUSTED_RULE, fenceUntrusted } from "../prompts/_shared/untrusted";
import type { Judge } from "./refine";

const verdictSchema = z.object({
  results: z.array(
    z.object({
      id: z.string().describe("Mã tiêu chí, đúng như trong danh sách"),
      passed: z.boolean(),
      issue: z.string().describe("Nếu chưa đạt: nêu cụ thể điểm nào chưa đạt và cần cải thiện theo hướng nào (một câu). Nếu đạt: để trống"),
    }),
  ),
});

/**
 * Bộ chấm độc lập bằng mô hình (nhiệt độ thấp). Không viết lại nội dung, chỉ nhận xét theo từng tiêu chí
 * để mô hình sinh tự sửa – tránh bộ chấm trở thành người soạn thay.
 */
export function createLlmJudge(getModel: () => BaseChatModel): Judge {
  return async ({ subject, criteria, output, context }) => {
    const prompt = [
      `Bạn là chuyên gia thẩm định nội dung giáo dục mầm non Việt Nam, khắt khe nhưng công bằng. Hãy chấm ${subject} theo TỪNG tiêu chí dưới đây.`,
      "Chỉ chấm theo tiêu chí được liệt kê, không thêm tiêu chí khác. Chấm 'đạt' khi đầu ra thực sự đáp ứng; nếu chưa đạt, nhận xét cụ thể, có thể hành động được. Không tự viết lại nội dung.",
      UNTRUSTED_RULE,
      `TIÊU CHÍ:\n${criteria.map((c) => `- [${c.id}] ${c.description}`).join("\n")}`,
      context ? `BỐI CẢNH:\n${context}` : "",
      fenceUntrusted("ĐẦU RA CẦN CHẤM", JSON.stringify(output, null, 2)),
    ]
      .filter(Boolean)
      .join("\n\n");
    const model = getModel().withStructuredOutput(verdictSchema as never, { name: "quality_review", method: "functionCalling" });
    return verdictSchema.parse(await model.invoke(prompt)).results;
  };
}
