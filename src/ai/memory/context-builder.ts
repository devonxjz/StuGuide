import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { cardDigest, messageToText, type StoredMessage } from "@/lib/message-text";

export { cardDigest, messageToText };
export type { StoredMessage };

/**
 * Quản lý ngữ cảnh hội thoại (ngân sách token):
 *  - Cửa sổ gửi cho LLM tối đa HISTORY_TOKEN_BUDGET.
 *  - Khi phần chưa tóm tắt vượt SUMMARY_TRIGGER_TOKENS thì gộp các tin CŨ NHẤT vào bản tóm tắt cuộn
 *    cho tới khi còn ≈ SUMMARY_TARGET_TOKENS (có độ trễ để không tóm tắt sau mỗi lượt).
 *  - Tin nào bị đẩy khỏi cửa sổ chắc chắn nằm trong phần cần tóm tắt, nên không mất thông tin.
 */
export const HISTORY_TOKEN_BUDGET = 5000;
export const SUMMARY_TRIGGER_TOKENS = 3500;
export const SUMMARY_TARGET_TOKENS = 2000;
const MIN_KEPT_MESSAGES = 2;

/** Ước lượng thận trọng cho tiếng Việt có dấu (≈ 2.5 ký tự / token). */
export const estimateTokens = (text: string) => (text ? Math.ceil(text.length / 2.5) : 0);

const toLangChain = (m: StoredMessage): BaseMessage => (m.role === "user" ? new HumanMessage(messageToText(m)) : new AIMessage(messageToText(m)));

export interface HistoryWindow {
  /** Tin nhắn gửi cho LLM (mới nhất cuối) */
  window: BaseMessage[];
  windowMessages: StoredMessage[];
  /** Các tin cũ nhất cần gộp vào summary (liên tục từ đầu phần chưa tóm tắt) */
  overflow: StoredMessage[];
}

export function buildHistoryWindow(messages: StoredMessage[], summaryUpTo: number): HistoryWindow {
  const candidates = messages.filter((m) => m.seq > summaryUpTo).sort((a, b) => a.seq - b.seq);
  const cost = candidates.map((m) => estimateTokens(messageToText(m)));
  const total = cost.reduce((a, b) => a + b, 0);

  // Cửa sổ: lấy từ tin mới nhất ngược về, không vượt ngân sách (luôn giữ ít nhất tin cuối)
  let start = candidates.length;
  let used = 0;
  while (start > 0 && (start === candidates.length || used + cost[start - 1] <= HISTORY_TOKEN_BUDGET)) {
    start -= 1;
    used += cost[start];
  }

  // Phần cần tóm tắt: khi vượt ngưỡng kích hoạt, gộp tin cũ nhất tới khi còn ≈ ngưỡng đích
  let fold = 0;
  if (total > SUMMARY_TRIGGER_TOKENS) {
    let remaining = total;
    while (remaining > SUMMARY_TARGET_TOKENS && candidates.length - fold > MIN_KEPT_MESSAGES) {
      remaining -= cost[fold];
      fold += 1;
    }
  }
  fold = Math.max(fold, start); // tin bị đẩy khỏi cửa sổ phải được tóm tắt

  const windowMessages = candidates.slice(start);
  return { window: windowMessages.map(toLangChain), windowMessages, overflow: candidates.slice(0, fold) };
}
