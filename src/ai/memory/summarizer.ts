import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { messageToText, type StoredMessage } from "./context-builder";

const SYSTEM = `Bạn quản lý trí nhớ hội thoại cho trợ lý giáo dục mầm non "Mầm Học AI".
Nhiệm vụ: cập nhật BẢN TÓM TẮT CUỘN bằng tiếng Việt từ bản tóm tắt cũ và các tin nhắn mới.
Giữ lại: yêu cầu và quyết định của cô; độ tuổi, mảng phát triển, chủ đề, vật liệu đã chọn; ý tưởng sáng tạo đã chốt hoặc bị bỏ; các id quan trọng (planId, cardId) kèm tên giáo án và trạng thái; việc đang dở và bước tiếp theo.
Bỏ: lời chào, lặp lại, chi tiết dài của giáo án (đã lưu trong hệ thống).
Tuyệt đối không chẩn đoán hay dán nhãn trẻ. Tối đa 220 từ, dạng gạch đầu dòng ngắn. Chỉ trả về bản tóm tắt.`;

/** Tóm tắt cuộn bằng model nhanh: (tóm tắt cũ + tin mới) → tóm tắt mới. */
export function createSummarizer(getModel: () => BaseChatModel) {
  return async ({ previousSummary, messages }: { previousSummary: string; messages: StoredMessage[] }): Promise<string> => {
    const transcript = messages.map((m) => `${m.role === "user" ? "Cô" : "Trợ lý"}: ${messageToText(m)}`).join("\n");
    const res = await getModel().invoke([
      new SystemMessage(SYSTEM),
      new HumanMessage(`BẢN TÓM TẮT CŨ:\n${previousSummary || "(chưa có)"}\n\nTIN NHẮN MỚI CẦN GỘP:\n${transcript}`),
    ]);
    const text = typeof res.content === "string" ? res.content : res.content.map((b) => ("text" in b ? String(b.text) : "")).join("");
    return text.trim();
  };
}
