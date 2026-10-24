import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StuGuideMessage } from "@/types/chat";
import { CardRenderer } from "./cards/card-renderer";

/** `restored`: tin nhắn tải lại từ lịch sử → các thẻ cần nạp trạng thái mới nhất từ server. */
export function MessageView({ message, restored = false }: { message: StuGuideMessage; restored?: boolean }) {
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <div className="flex justify-end animate-pop-in">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm whitespace-pre-wrap text-primary-foreground shadow-soft">{text}</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-pop-in">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-lilac-soft text-lilac-strong">
        <Bot className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return part.text.trim() ? (
              <p key={i} className={cn("max-w-[44rem] rounded-2xl rounded-tl-md border bg-card px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-soft")}>
                {part.text}
              </p>
            ) : null;
          }
          if (part.type === "data-card") return <CardRenderer key={i} data={part.data} restored={restored} />;
          return null;
        })}
      </div>
    </div>
  );
}
