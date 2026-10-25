import { z } from "zod";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { DistillArgs } from "@/services/family/learning-session.service";
import { parseWithRepair } from "../structured-repair";

const resultSchema = z.object({
  summary: z.string().describe("Tóm tắt 1–2 câu về phiên dùng này"),
  facts: z.array(z.string()).max(5).describe("Tối đa 5 điều đáng nhớ về bé, mỗi điều một câu ngắn"),
});

const SYSTEM = `Bạn chắt lọc trí nhớ dài hạn cho trợ lý gia đình của "Mầm Học AI" từ một phiên phụ huynh dùng iPad.
Chỉ rút ra những điều bền vững, hữu ích để CÁ NHÂN HÓA lần sau về BÉ: sở thích (nhân vật, đồ vật, hoạt động), thứ bé hay chơi, cách bé phản ứng tốt, thói quen, hoạt động đã làm và bé thích hay không.
Chỉ ghi điều BỀN VỮNG dùng được cho nhiều lần sau (sở thích, nhân vật yêu thích, kiểu trò chơi bé hợp, cách bé hào hứng). KHÔNG ghi: số bước/số lần đã làm, phản ứng chung chung của riêng một buổi ("bé vui", "bé hoàn thành"), thông tin riêng tư của người lớn, địa chỉ, số điện thoại, ảnh, thông tin sức khỏe, và TUYỆT ĐỐI không ghi lời chẩn đoán hay nhãn tâm lý (tự kỷ, tăng động, chậm phát triển…) dù phụ huynh có nhắc tới: bỏ qua phần đó. Không lặp lại điều đã có trong "ĐÃ NHỚ". Viết tiếng Việt, tích cực, mô tả sở thích/hành vi.
Nếu phiên không có gì đáng nhớ thì trả facts rỗng.`;

/** Chắt lọc phiên ở nhà thành tóm tắt + sự thật về bé bằng model nhanh (structured output). */
export function createChildDistiller(getModel: () => BaseChatModel) {
  return async (args: DistillArgs): Promise<{ summary: string; facts: string[] }> => {
    const transcript = args.transcript.map((t) => `${t.role === "parent" ? "Phụ huynh" : "Trợ lý"}: ${t.text}`).join("\n");
    const notes = args.events.filter((e) => e.type === "note").map((e) => String((e.data as { text?: unknown } | undefined)?.text ?? "")).filter(Boolean);
    const steps = args.events.filter((e) => e.type === "activity-step").length;
    const reactions = args.events.filter((e) => e.type === "reaction").map((e) => String((e.data as { emoji?: unknown } | undefined)?.emoji ?? "")).join("");
    const prompt = `${SYSTEM}\n\nBÉ: ${args.studentName} (${args.ageLabel})\nĐÃ NHỚ:\n${args.existingMemories.map((m) => `- ${m}`).join("\n") || "(chưa có)"}\n\nHỘI THOẠI:\n${transcript || "(không có)"}\n\nGHI CHÚ CỦA PHỤ HUYNH:\n${notes.join("\n") || "(không có)"}\nSố bước hoạt động đã đánh dấu hoàn thành: ${steps}. Phản ứng của bé: ${reactions || "(không có)"}`;
    const model = getModel().withStructuredOutput(resultSchema as never, { name: "child_memory", method: "functionCalling" });
    return parseWithRepair({
      schema: resultSchema,
      invoke: (p) => model.invoke(p),
      prompt,
      label: "child_memory",
      friendlyMessage: "AI chắt lọc chưa đúng định dạng, bấm thử lại",
    });
  };
}
