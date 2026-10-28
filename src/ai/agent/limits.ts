import { ToolMessage } from "@langchain/core/messages";
import { createMiddleware } from "langchain";

/** Trần mỗi lượt chat: số lần gọi công cụ và thời gian tối đa của cả lượt. */
export interface AgentLimits {
  maxToolCalls: number;
  timeoutMs: number;
}

export const AGENT_TIMEOUT_MS = 120_000;

/** Chat giáo viên có nhiều công cụ hơn; chat gia đình đi thẳng tới phụ huynh nên gọn hơn. */
export const TEACHER_CHAT_LIMITS: AgentLimits = { maxToolCalls: 8, timeoutMs: AGENT_TIMEOUT_MS };
export const FAMILY_CHAT_LIMITS: AgentLimits = { maxToolCalls: 5, timeoutMs: AGENT_TIMEOUT_MS };

export const LIMIT_REACHED_NOTE = "Đã đạt giới hạn số lần gọi công cụ cho lượt này. Đừng gọi thêm công cụ nào: hãy trả lời dựa trên kết quả đã có và nói rõ với người dùng rằng bạn đã dừng sớm nên có thể còn thiếu.";
export const REPEATED_CALL_NOTE = "Bạn vừa gọi đúng công cụ này với đúng tham số này và đã có kết quả. Đừng lặp lại: hãy dùng kết quả đã có để trả lời.";

/**
 * Lưới chặn cuối cho đồ thị nếu model cứ gọi tiếp sau khi đã bị chặn. Mỗi vòng công cụ tốn tối đa 3 bước (model, công cụ, middleware);
 * chừa maxToolCalls + 1 vòng (vòng cuối là lần gọi bị chặn) cộng bước mở đầu và lượt trả lời cuối.
 */
export const recursionLimitFor = (maxToolCalls: number) => 3 * (maxToolCalls + 2) + 2;

/**
 * Bảo vệ một lượt chat khỏi vòng lặp công cụ. Công cụ bị chặn không chạy mà trả ghi chú cho model,
 * để model vẫn trả lời người dùng bằng kết quả đã có (khác với việc kết thúc lượt đột ngột):
 *  - vượt maxToolCalls lần gọi;
 *  - gọi lại ngay cùng công cụ với cùng tham số (dấu hiệu vòng lặp).
 * Mỗi lượt chat dựng một agent mới nên bộ đếm là riêng của lượt.
 */
export function toolCallGuard(maxToolCalls: number) {
  let calls = 0;
  let lastSignature: string | undefined;
  return createMiddleware({
    name: "ToolCallGuard",
    wrapToolCall: async (request, handler) => {
      const { name, args, id } = request.toolCall;
      const signature = `${name}:${JSON.stringify(args)}`;
      const blockedBy = ++calls > maxToolCalls ? LIMIT_REACHED_NOTE : signature === lastSignature ? REPEATED_CALL_NOTE : null;
      lastSignature = signature;
      if (!blockedBy) return handler(request);
      return new ToolMessage({ content: blockedBy, tool_call_id: id ?? "", name, status: "error" });
    },
  });
}
