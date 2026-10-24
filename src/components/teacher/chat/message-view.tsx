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
        <p className="max-w-[85%] rounded-2xl rounded-br-xs bg-primary px-4.5 py-2.5 text-sm font-medium whitespace-pre-wrap text-white shadow-soft">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-pop-in">
      <span className="mt-0.5 grid size-8.5 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-primary via-lilac to-sky text-white shadow-soft">
        <Bot className="size-4.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return part.text.trim() ? (
              <p key={i} className={cn("max-w-[44rem] rounded-2xl rounded-tl-xs border border-border/80 bg-card px-4.5 py-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground shadow-soft")}>
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
