import { randomUUID } from "node:crypto";
import type { UIMessageStreamWriter } from "ai";

type AgentChunk = [mode: string, payload: unknown];

/** Lấy phần chữ từ content của chunk (string hoặc mảng content blocks). */
function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((b) => (b && typeof b === "object" && "text" in b ? String((b as { text: unknown }).text) : "")).join("");
  return "";
}

interface Writer {
  write: UIMessageStreamWriter["write"];
}

/**
 * Cầu nối LangGraph -> AI SDK UI message stream:
 *  - token của model  -> text-delta (chỉ lấy node model_request, bỏ qua LLM lồng trong công cụ)
 *  - writer() của tool -> data-status (transient: tiến trình các bước)
 *  - artifact của ToolMessage -> data-card (thẻ kết quả vẽ trong chat)
 */
export async function pipeAgentToUi(stream: AsyncIterable<unknown>, writer: Writer): Promise<void> {
  let openText: string | null = null;
  const closeText = () => {
    if (openText) writer.write({ type: "text-end", id: openText });
    openText = null;
  };

  for await (const raw of stream) {
    const [mode, payload] = raw as AgentChunk;

    if (mode === "custom") {
      writer.write({ type: "data-status", data: payload, transient: true } as never);
      continue;
    }
    if (mode !== "messages") continue;

    const [message, meta] = payload as [{ getType(): string; content: unknown; artifact?: unknown; name?: string; tool_call_chunks?: { name?: string }[] }, { langgraph_node?: string }];
    const type = message.getType();

    if (type === "tool") {
      closeText();
      if (message.artifact && typeof message.artifact === "object") {
        writer.write({ type: "data-card", data: { ...message.artifact, tool: message.name } } as never);
      }
      continue;
    }

    if (type !== "ai" || meta?.langgraph_node !== "model_request") continue;

    const calling = message.tool_call_chunks?.find((c) => c.name);
    if (calling?.name) {
      closeText();
      writer.write({ type: "data-status", data: { type: "tool", name: calling.name }, transient: true } as never);
    }

    const delta = textOf(message.content);
    if (delta) {
      if (!openText) {
        openText = randomUUID();
        writer.write({ type: "text-start", id: openText });
      }
      writer.write({ type: "text-delta", id: openText, delta });
    }
  }
  closeText();
}
