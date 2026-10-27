import Image from "next/image";
import { MarkdownText } from "@/components/shared/markdown-text";
import type { StuGuideMessage } from "@/types/chat";
import { CardRenderer } from "./cards/card-renderer";

/** `restored`: tin nhắn tải lại từ lịch sử → các thẻ cần nạp trạng thái mới nhất từ server. */
export function MessageView({ message, restored = false }: { message: StuGuideMessage; restored?: boolean }) {
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <div className="flex justify-end animate-fade-up">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-sm whitespace-pre-wrap text-white">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-fade-up">
      <div className="relative mt-0.5 shrink-0">
        <span className="grid size-8 place-items-center rounded-lg bg-white p-1 border border-slate-200">
          <Image
            src="/stuguide-icon.png"
            alt="StuGuide AI"
            width={24}
            height={24}
            className="size-5.5 object-contain"
          />
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return part.text.trim() ? (
              <MarkdownText
                key={i}
                text={part.text}
                className="max-w-[44rem] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700"
              />
            ) : null;
          }
          if (part.type === "data-card") return <CardRenderer key={i} data={part.data} restored={restored} />;
          return null;
        })}
      </div>
    </div>
  );
}
