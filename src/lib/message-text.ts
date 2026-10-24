import type { CardPayload, StuGuideMessage } from "@/types/chat";

/** Chuyển tin nhắn/thẻ thành văn bản ngữ cảnh. Thuần TS (không phụ thuộc LangChain) nên dùng được cả ở client. */

export interface StoredMessage {
  seq: number;
  role: "user" | "assistant";
  parts: StuGuideMessage["parts"];
}

/** Thẻ kết quả → một dòng ngắn để LLM nhớ mình đã làm gì (kèm id để gọi công cụ tiếp). */
export function cardDigest(card: CardPayload): string {
  switch (card.kind) {
    case "plan":
      return `Giáo án "${card.plan.gameName}" (planId=${card.planId}, trạng thái ${card.plan.status})`;
    case "checklist":
      return `Checklist quan sát ${card.criteria.length} tiêu chí cho "${card.gameName}" (planId=${card.planId})`;
    case "parent-card":
      return `Thẻ phụ huynh (cardId=${card.cardId}, planId=${card.planId}, trạng thái ${card.status})`;
    case "feedback-stats":
      return `Phản hồi phụ huynh: ${card.stats.completed}/${card.stats.total} hoàn thành (cardId=${card.cardId})`;
    case "alerts":
      return `Gợi ý quan sát sâu: ${card.alerts.map((a) => `${a.studentName} (${a.pattern})`).join("; ") || "không có"}`;
    case "plan-list":
      return `Danh sách giáo án: ${card.plans.map((p) => `"${p.gameName}" (planId=${p.id}, ${p.status})`).join("; ")}`;
    case "knowledge":
      return `Tra cứu "${card.title}": ${card.items.slice(0, 3).map((i) => i.documentCode).join(", ")}`;
    case "home-activity":
      return `Hoạt động ở nhà đã gợi ý: "${card.activity.title}" (${card.activity.minutes} phút)`;
    case "child-progress":
      return `Tiến bộ theo mảng: ${card.progress.map((p) => `${p.label}: ${p.level}`).join("; ")}`;
    case "child-lessons":
      return `Bài học gần đây: ${card.lessons.map((l) => `"${l.gameName}"`).join("; ")}`;
    case "notice":
      return `Thông báo: ${card.message}`;
  }
}

export function messageToText(m: StoredMessage): string {
  const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
  if (m.role === "user") return text;
  const digests = m.parts.filter((p) => p.type === "data-card").map((p) => `- ${cardDigest((p as { data: CardPayload }).data)}`);
  return [text, digests.length ? `[Thao tác/kết quả đã hiển thị cho cô:\n${digests.join("\n")}]` : ""].filter(Boolean).join("\n");
}


/** UIMessage[] → lượt hội thoại gửi cho trợ lý gia đình (kèm tóm gọn các thẻ kết quả để AI nhớ đã gợi ý gì). */
export function messagesToTurns(messages: StuGuideMessage[]): { role: "parent" | "assistant"; text: string }[] {
  return messages
    .map((m, i) => ({ role: m.role === "user" ? ("parent" as const) : ("assistant" as const), text: messageToText({ seq: i + 1, role: m.role === "user" ? "user" : "assistant", parts: m.parts }) }))
    .filter((t) => t.text.length > 0);
}
