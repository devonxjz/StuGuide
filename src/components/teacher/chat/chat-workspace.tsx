"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, ClipboardCheck, PlusCircle, RotateCcw, Sparkles, Square, Users, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { newConversationId } from "@/lib/ids";
import { AiLoadingStepper } from "@/components/shared/ai-loading-stepper";
import type { StatusData, StuGuideMessage } from "@/types/chat";
import { ChatActionsContext } from "./chat-context";
import { Composer } from "./composer";
import { MessageView } from "./message-view";

const TOOL_LABELS: Record<string, string> = {
  create_lesson_plan: "Đang soạn giáo án",
  rewrite_plan_section: "Đang viết lại phần này",
  approve_plan: "Đang phê duyệt và tạo checklist",
  generate_checklist: "Đang tạo checklist quan sát",
  generate_parent_card: "Đang soạn thẻ cho phụ huynh",
  send_parent_card: "Đang gửi thẻ cho phụ huynh",
  search_legal_docs: "Đang tra cứu căn cứ pháp lý",
  check_safety_rules: "Đang kiểm tra quy tắc an toàn",
  search_folk_games: "Đang tìm trò chơi dân gian",
  search_stem_activities: "Đang tìm hoạt động STEM",
  analyze_class_behavior: "Đang xem các gợi ý quan sát sâu",
  get_parent_feedback_stats: "Đang xem phản hồi của phụ huynh",
  list_recent_plans: "Đang lấy danh sách giáo án",
};

/** ERR-NET-01: sau ngần này giây chưa xong thì báo cho cô và mời gửi lại */
const SLOW_AFTER_MS = 20_000;

const FIRST_PROMPT = "Soạn trò chơi cho lớp 4–5 tuổi, mảng tình cảm, chủ đề Bản thân & Tình bạn, có hộp sữa, rổ nhựa, bóng";
const SUGGESTIONS = [
  "Tra cứu căn cứ pháp lý cho lớp 4–5 tuổi mảng tình cảm xã hội",
  "Bé nào cần quan sát sâu?",
  "Tỷ lệ phụ huynh phản hồi bao nhiêu rồi?",
  "Gợi ý trò chơi dân gian cho lớp",
];

/** Màn hình chính của giáo viên: làm việc bằng cách nhắn tin, kết quả hiện thành thẻ trong chat. */
export function ChatWorkspace({
  teacherName,
  className,
  conversationId: initialId,
  initialMessages = [],
}: {
  teacherName: string;
  className: string;
  /** Cuộc trò chuyện đã lưu; bỏ trống = chat mới (id sinh ở client) */
  conversationId?: string;
  initialMessages?: StuGuideMessage[];
}) {
  const router = useRouter();
  // Bộ khởi tạo lười của useState chỉ chạy một lần khi mount nên an toàn dù sinh id ngẫu nhiên
  const [restoredIds] = useState(() => new Set(initialMessages.map((m) => m.id)));
  const [conversationId] = useState(() => initialId ?? newConversationId());
  const [activity, setActivity] = useState<StatusData | null>(null);
  const [busyNotice, setBusyNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<StuGuideMessage>({
        api: "/api/chat",
        // Server giữ lịch sử, trí nhớ và giáo án đang làm việc: client chỉ gửi tin mới nhất của cô
        prepareSendMessagesRequest: ({ id, messages }) => ({ body: { id, message: messages[messages.length - 1] } }),
      }),
    [],
  );

  const { messages, sendMessage, regenerate, status, stop, error } = useChat<StuGuideMessage>({
    id: conversationId,
    messages: initialMessages,
    transport,
    onData: (part) => {
      if (part.type === "data-status") setActivity(part.data);
      if (part.type === "data-notice") setBusyNotice(part.data.message);
    },
    onFinish: () => {
      setActivity(null);
      // giữ URL theo cuộc trò chuyện (không remount) và làm mới cột danh sách/trí nhớ
      if (!new URLSearchParams(window.location.search).get("c")) window.history.replaceState(null, "", `/teacher?c=${conversationId}`);
      router.refresh();
    },
    onError: () => setBusyNotice("Hệ thống AI phản hồi hơi lâu hoặc đang bận. Cô có thể chờ thêm hoặc gửi lại giúp mình nhé."),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setBusyNotice("Hệ thống AI phản hồi hơi lâu hoặc đang bận. Cô có thể chờ thêm hoặc gửi lại giúp mình nhé."), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [busy]);
  const send = (text: string) => {
    setBusyNotice(null);
    void sendMessage({ text });
  };

  const retry = () => {
    setBusyNotice(null);
    if (busy) void stop();
    void regenerate();
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, activity, busy]);

  // ERR-DATA-01: cảnh báo khi đang soạn dở mà tắt tab
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const lastIsAssistantWithContent = messages.at(-1)?.role === "assistant" && (messages.at(-1)?.parts.length ?? 0) > 0;
  const showTyping = busy && !lastIsAssistantWithContent;

  return (
    <ChatActionsContext.Provider value={{ send }}>
      <div className="flex h-[calc(100dvh-7.5rem)] flex-col md:h-[calc(100dvh-3.4rem)]">
        <div className="bg-dots scroll-thin flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.length === 0 ? (
              <Welcome teacherName={teacherName} className={className} onPick={send} />
            ) : (
              messages.map((m) => <MessageView key={m.id} message={m} restored={restoredIds.has(m.id)} />)
            )}

            {showTyping && (
              <div className="flex items-start gap-3" aria-live="polite">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-lilac-soft text-lilac-strong">
                  <Bot className="size-4" aria-hidden />
                </span>
                <div className="rounded-2xl rounded-tl-md border bg-card px-4 py-3 shadow-soft">
                  {activity?.type === "step" ? (
                    <AiLoadingStepper current={activity.step} />
                  ) : (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <span className="dot-bounce inline-flex gap-1" aria-hidden>
                        <span className="size-1.5 rounded-full bg-lilac" />
                        <span className="size-1.5 rounded-full bg-lilac" />
                        <span className="size-1.5 rounded-full bg-lilac" />
                      </span>
                      {activity?.type === "tool" ? `${TOOL_LABELS[activity.name] ?? "Đang xử lý"}…` : "Mầm Học AI đang suy nghĩ…"}
                    </div>
                  )}
                </div>
              </div>
            )}

            {busyNotice && (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-sun/50 bg-sun-soft p-4 text-sm text-sun-strong">
                <WifiOff className="size-5 shrink-0" aria-hidden />
                <p className="min-w-0 flex-1 font-medium">{busyNotice}</p>
                <Button size="sm" variant="sun" onClick={retry}>
                  <RotateCcw /> Gửi lại
                </Button>
              </div>
            )}
            {error && !busyNotice && <p className="sr-only">{error.message}</p>}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t bg-background/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto max-w-3xl space-y-2">
            {messages.length > 0 && !busy && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {["Phê duyệt giáo án này", "Viết lại lời dẫn vui hơn", "Soạn thẻ nhiệm vụ 5 phút cho phụ huynh", "Bé nào cần quan sát sâu?"].map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Composer onSend={send} busy={busy} />
              </div>
              {busy && (
                <Button variant="outline" size="icon" aria-label="Dừng" onClick={() => stop()}>
                  <Square />
                </Button>
              )}
            </div>
            <p className="text-center text-[11px] text-muted-foreground">AI chỉ tạo bản nháp – cô luôn là người rà soát và phê duyệt. Không chẩn đoán, không dán nhãn trẻ.</p>
          </div>
        </div>
      </div>
    </ChatActionsContext.Provider>
  );
}

function Welcome({ teacherName, className, onPick }: { teacherName: string; className: string; onPick: (t: string) => void }) {
  const first = teacherName.split(" ").slice(-1)[0];
  return (
    <div className="space-y-8 py-4 animate-pop-in">
      <div className="text-center">
        <span className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.7_0.15_130)] text-primary-foreground shadow-soft">
          <Sparkles className="size-8" aria-hidden />
        </span>
        <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">Chào cô {first}! Hôm nay {className.replace(/^Lớp/, "lớp")} mình cùng làm gì ạ?</h1>
        <p className="mx-auto mt-2 max-w-lg text-balance text-muted-foreground">Cô cứ nhắn như nói chuyện, mình sẽ soạn kế hoạch, kiểm tra an toàn, tra cứu căn cứ pháp lý và chuẩn bị thẻ cho phụ huynh.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => onPick(FIRST_PROMPT)} className="group rounded-3xl border bg-card p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary">
          <span className="mb-3 grid size-10 place-items-center rounded-2xl bg-primary-soft text-primary-strong"><PlusCircle className="size-5" aria-hidden /></span>
          <span className="block font-semibold">Tạo Kế hoạch & Trò chơi mới</span>
          <span className="mt-1 block text-xs text-muted-foreground">Một câu là có bản nháp đủ pháp lý, an toàn, lời dẫn.</span>
        </button>
        <Link href="/teacher/assess" className="group rounded-3xl border bg-card p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary">
          <span className="mb-3 grid size-10 place-items-center rounded-2xl bg-sun-soft text-sun-strong"><ClipboardCheck className="size-5" aria-hidden /></span>
          <span className="block font-semibold">Ghi nhận Quan sát (30 giây)</span>
          <span className="mt-1 block text-xs text-muted-foreground">Tích chọn cả lớp nhanh, AI nhắc bé cần quan sát sâu.</span>
        </Link>
        <button type="button" onClick={() => onPick("Soạn thẻ nhiệm vụ 5 phút cho phụ huynh")} className="group rounded-3xl border bg-card p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary">
          <span className="mb-3 grid size-10 place-items-center rounded-2xl bg-sky-soft text-sky-strong"><Users className="size-5" aria-hidden /></span>
          <span className="block font-semibold">Soạn Thẻ hoạt động Phụ huynh</span>
          <span className="mt-1 block text-xs text-muted-foreground">Nhiệm vụ 5 phút buổi tối, phản hồi 1 chạm.</span>
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => onPick(s)} className="rounded-full border bg-card px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
