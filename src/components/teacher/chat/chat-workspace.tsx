"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Image from "next/image";
import { ClipboardCheck, PlusCircle, RotateCcw, Square, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { newConversationId } from "@/lib/ids";
import { AiLoadingStepper } from "@/components/shared/ai-loading-stepper";
import { useDeviceQuota, type DeviceQuota } from "@/hooks/use-device-quota";
import { quotaAwareFetch } from "@/lib/device-quota";
import { userMessage } from "@/lib/api-error";
import { QUOTA_EXCEEDED_MESSAGE } from "@/core/constants/quota";
import { cn } from "@/lib/utils";
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
  "Tra cứu căn cứ pháp lý cho lớp 4–5 tuổi mảng tình cảm",
  "Bé nào trong lớp cần quan sát sâu?",
  "Tỷ lệ phụ huynh phản hồi bao nhiêu rồi?",
  "Gợi ý trò chơi dân gian rèn khéo léo",
];

/** Lối vào nhanh ở màn chào: gửi sẵn một câu cho trợ lý, hoặc mở một trang khác. */
type QuickAction = { icon: LucideIcon; title: string; hint: string } & ({ prompt: string } | { href: string });
const QUICK_ACTIONS: QuickAction[] = [
  { icon: PlusCircle, title: "Soạn trò chơi mới", hint: "Kèm căn cứ pháp lý và lưu ý an toàn", prompt: FIRST_PROMPT },
  { icon: ClipboardCheck, title: "Ghi nhận quan sát", hint: "Tích chọn cả lớp trong 30 giây", href: "/teacher/assess" },
  { icon: Users, title: "Thẻ cho phụ huynh", hint: "Nhiệm vụ 5 phút buổi tối", prompt: "Soạn thẻ nhiệm vụ 5 phút cho phụ huynh" },
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
  const { quota, refresh: refreshQuota } = useDeviceQuota();

  const transport = useMemo(
    () =>
      new DefaultChatTransport<StuGuideMessage>({
        api: "/api/chat",
        fetch: quotaAwareFetch,
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
      void refreshQuota();
      // giữ URL theo cuộc trò chuyện (không remount) và làm mới cột danh sách/trí nhớ
      if (!new URLSearchParams(window.location.search).get("c")) window.history.replaceState(null, "", `/teacher?c=${conversationId}`);
      router.refresh();
    },
    onError: (err) => {
      void refreshQuota();
      // hết lượt, bấm quá nhanh… hiện đúng lời server; lỗi hệ thống/mạng hiện câu chung
      setBusyNotice(userMessage(err, "Hệ thống AI phản hồi hơi lâu hoặc đang bận. Cô có thể chờ thêm hoặc gửi lại giúp mình nhé."));
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setBusyNotice("Hệ thống AI phản hồi hơi lâu hoặc đang bận. Cô có thể chờ thêm hoặc gửi lại giúp mình nhé."), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [busy]);
  const send = (text: string) => {
    if (quota.isExceeded) {
      setBusyNotice("Quá hạn sử dụng, bạn phải mua thêm lượt");
      return;
    }
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
        <div className="scroll-thin flex-1 overflow-y-auto bg-white px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.length === 0 ? (
              <Welcome teacherName={teacherName} className={className} onPick={send} quota={quota} />
            ) : (
              messages.map((m) => <MessageView key={m.id} message={m} restored={restoredIds.has(m.id)} />)
            )}

            {showTyping && (
              <div className="flex items-start gap-3" aria-live="polite">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white p-1">
                  <Image src="/stuguide-icon.png" alt="" width={24} height={24} className="size-5.5 object-contain" />
                </span>
                <div className="py-1.5">
                  {activity?.type === "step" ? (
                    <AiLoadingStepper current={activity.step} />
                  ) : (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <span className="text-shimmer font-medium">
                      {activity?.type === "tool" ? `${TOOL_LABELS[activity.name] ?? "Đang xử lý"}…` : "StuGuide đang suy nghĩ…"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {busyNotice && (
              <div
                role="alert"
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm",
                  busyNotice.includes("Quá hạn") ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800",
                )}
              >
                <p className="min-w-0 flex-1">{busyNotice}</p>
                {!quota.isExceeded && !busyNotice.includes("Quá hạn") && (
                  <Button size="sm" variant="sun" onClick={retry}>
                    <RotateCcw /> Gửi lại
                  </Button>
                )}
              </div>
            )}
            {error && !busyNotice && <p className="sr-only">{error.message}</p>}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t bg-background/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto max-w-3xl space-y-2">
            {quota.isExceeded && (
              <p role="alert" className="rounded-xl bg-rose-50 px-4 py-2.5 text-center text-sm text-rose-700">
                {QUOTA_EXCEEDED_MESSAGE}
              </p>
            )}
            {messages.length > 0 && !busy && !quota.isExceeded && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {["Phê duyệt giáo án này", "Viết lại lời dẫn vui hơn", "Soạn thẻ nhiệm vụ 5 phút cho phụ huynh", "Bé nào cần quan sát sâu?"].map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-foreground">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Composer
                  onSend={send}
                  busy={busy || quota.isExceeded}
                  placeholder={quota.isExceeded ? "Quá hạn sử dụng, bạn phải mua thêm lượt" : undefined}
                />
              </div>
              {busy && (
                <Button variant="outline" size="icon" aria-label="Dừng" onClick={() => stop()}>
                  <Square />
                </Button>
              )}
            </div>
            <p className="text-center text-[11px] text-slate-400">AI chỉ tạo bản nháp – cô luôn là người duyệt cuối.</p>
          </div>
        </div>
      </div>
    </ChatActionsContext.Provider>
  );
}

function Welcome({
  teacherName,
  className,
  onPick,
  quota,
}: {
  teacherName: string;
  className: string;
  onPick: (text: string) => void;
  quota: DeviceQuota;
}) {
  const first = teacherName.split(" ").slice(-1)[0];
  const tile =
    "flex flex-col items-start gap-1 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="space-y-8 py-10 animate-pop-in">
      <div className="text-center">
        <Image src="/stuguide-icon.png" alt="StuGuide" width={40} height={40} className="mx-auto mb-5 size-10 object-contain" priority />
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-900">
          Chào cô {first}! Hôm nay {className.replace(/^Lớp/, "lớp")} chơi gì ạ?
        </h1>
        <p className="mt-2 text-sm text-slate-500">Cô cứ nhắn tự nhiên, mình soạn giúp cô.</p>
        {quota.isExceeded && (
          <p role="alert" className="mx-auto mt-4 max-w-md rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {QUOTA_EXCEEDED_MESSAGE}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {QUICK_ACTIONS.map((action) => {
          const content = (
            <>
              <action.icon className="mb-2 size-4 text-slate-400" aria-hidden />
              <span className="text-sm font-semibold text-slate-900">{action.title}</span>
              <span className="text-xs text-slate-500">{action.hint}</span>
            </>
          );
          return "href" in action ? (
            <Link key={action.title} href={action.href} className={tile}>
              {content}
            </Link>
          ) : (
            <button key={action.title} type="button" disabled={quota.isExceeded} onClick={() => onPick(action.prompt)} className={tile}>
              {content}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={quota.isExceeded}
            onClick={() => onPick(s)}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
