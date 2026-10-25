import Image from "next/image";
import { Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StuGuideMessage } from "@/types/chat";
import { CardRenderer } from "./cards/card-renderer";

/** `restored`: tin nhắn tải lại từ lịch sử → các thẻ cần nạp trạng thái mới nhất từ server. */
export function MessageView({ message, restored = false }: { message: StuGuideMessage; restored?: boolean }) {
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <div className="flex justify-end animate-pop-in">
        <p className="max-w-[85%] rounded-3xl rounded-br-md bg-gradient-to-r from-primary via-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold whitespace-pre-wrap text-white shadow-colorful">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-pop-in">
      <div className="relative mt-0.5 shrink-0">
        <span className="grid size-9 place-items-center rounded-2xl bg-white p-1 border border-blue-200 shadow-soft">
          <Image
            src="/stuguide-icon.png"
            alt="StuGuide AI"
            width={24}
            height={24}
            className="size-5.5 object-contain"
          />
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 grid size-3.5 place-items-center rounded-full bg-amber-400 text-white text-[8px] font-bold ring-1.5 ring-white">
          ✨
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return part.text.trim() ? (
              <p
                key={i}
                className={cn(
                  "max-w-[44rem] rounded-3xl rounded-tl-md border border-slate-200/90 bg-white px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap text-slate-800 shadow-soft"
                )}
              >
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
