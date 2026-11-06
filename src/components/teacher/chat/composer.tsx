"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, AudioLines, FileText, Loader2, Mic, Plus, Square, X } from "lucide-react";
import { clearDraft, loadDraft, useAutoSave } from "@/hooks/use-auto-save";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { uploadFile } from "@/lib/api-client";
import { userMessage } from "@/lib/api-error";
import { MAX_ATTACHMENTS, type Attachment } from "@/lib/attachments";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "sg:chat-draft";
const ACCEPT = ".pdf,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv";
/** Gửi tài liệu mà chưa gõ gì: dùng câu mặc định để AI biết cần làm gì */
const DEFAULT_ATTACHMENT_PROMPT = "Cô gửi tài liệu này. Hãy đọc và tóm tắt các ý chính giúp mình.";

type AttachedFile = Attachment & { truncated: boolean };

export function Composer({
  onSend,
  busy,
  placeholder,
}: {
  /** `attachments` chỉ có khi cô đính kèm tài liệu */
  onSend: (text: string, attachments?: Attachment[]) => void;
  busy: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Khôi phục bản nháp từ localStorage sau khi hydrate (nguồn ngoài React, không thể đọc lúc SSR)
    const draft = loadDraft<string>(DRAFT_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (draft) setText(draft);
    setHydrated(true);
  }, []);
  useAutoSave(DRAFT_KEY, text, { enabled: hydrated && text.length > 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const voice = useVoiceRecorder({
    onTranscript: (spoken) => {
      setNotice(null);
      setText((current) => (current.trim() ? `${current.trimEnd()} ${spoken}` : spoken));
      ref.current?.focus();
    },
    onError: setNotice,
  });
  const recording = voice.state === "recording";
  const transcribing = voice.state === "transcribing";
  const toggleVoice = () => {
    setNotice(null);
    if (recording) voice.stop();
    else void voice.start();
  };

  const attach = async (picked: FileList | null) => {
    const list = Array.from(picked ?? []);
    if (fileInput.current) fileInput.current.value = ""; // cho phép chọn lại đúng tệp vừa gỡ
    if (list.length === 0) return;
    if (files.length + list.length > MAX_ATTACHMENTS) {
      setNotice(`Mỗi tin nhắn đính kèm tối đa ${MAX_ATTACHMENTS} tài liệu.`);
      return;
    }
    setNotice(null);
    setUploading(true);
    try {
      for (const file of list) {
        const doc = await uploadFile<AttachedFile>("/api/chat/attachments", file, file.name);
        setFiles((current) => [...current, { name: doc.name, text: doc.text, truncated: doc.truncated }]);
      }
    } catch (err) {
      setNotice(userMessage(err, "Không đọc được tài liệu, cô thử lại giúp mình nhé."));
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    const value = text.trim() || (files.length > 0 ? DEFAULT_ATTACHMENT_PROMPT : "");
    if (!value || busy || uploading || transcribing) return;
    if (recording) voice.stop();
    if (files.length > 0) onSend(value, files.map(({ name, text }) => ({ name, text })));
    else onSend(value);
    setText("");
    setFiles([]);
    setNotice(null);
    clearDraft(DRAFT_KEY);
  };

  const canSend = text.trim().length > 0 || files.length > 0;
  // Giống ChatGPT: chưa có gì để gửi thì nút tròn là nút ghi âm, có chữ/tài liệu thì thành nút gửi
  const roundIsVoice = !canSend && voice.supported;
  const iconButton =
    "flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40";

  const voiceLabel = recording ? "Dừng ghi âm" : "Nói để nhập";
  const idlePlaceholder = placeholder ?? "Nhắn cho StuGuide… ví dụ: Soạn trò chơi cho lớp 4–5 tuổi với bóng và rổ nhựa";
  const livePlaceholder = recording ? "Đang nghe… bấm nút dừng khi cô nói xong" : transcribing ? "Đang chuyển giọng nói thành chữ…" : idlePlaceholder;

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="rounded-[28px] border border-slate-200 bg-white p-2 shadow-sm transition-colors duration-200 focus-within:border-slate-300"
      >
        {(files.length > 0 || uploading) && (
          <ul className="flex flex-wrap gap-2 px-2 pt-1 pb-2" aria-label="Tài liệu đính kèm">
            {files.map((file, i) => (
              <li key={`${file.name}-${i}`} className="flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1 pr-1 pl-2.5 text-xs font-medium text-slate-700">
                <FileText className="size-3.5 shrink-0 text-blue-600" aria-hidden />
                <span className="truncate">{file.name}</span>
                {file.truncated && <span className="shrink-0 text-amber-600">(chỉ đọc phần đầu)</span>}
                <button
                  type="button"
                  aria-label={`Gỡ ${file.name}`}
                  onClick={() => setFiles((current) => current.filter((_, j) => j !== i))}
                  className="grid size-5 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
            {uploading && (
              <li className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500">
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> Đang đọc tài liệu…
              </li>
            )}
          </ul>
        )}
        <div className="flex items-end gap-1">
          <input ref={fileInput} type="file" hidden multiple accept={ACCEPT} data-testid="file-input" onChange={(e) => void attach(e.target.files)} />
          <button
            type="button"
            aria-label="Đính kèm tài liệu"
            title="Đính kèm tài liệu (PDF, Word, văn bản)"
            disabled={busy || uploading || files.length >= MAX_ATTACHMENTS}
            onClick={() => fileInput.current?.click()}
            className={iconButton}
          >
            <Plus className="size-5" />
          </button>
          <textarea
            ref={ref}
            value={text}
            rows={1}
            disabled={busy}
            aria-label="Nhắn cho StuGuide"
            placeholder={livePlaceholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 font-medium text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
          />
          {voice.supported && (
            <button
              type="button"
              disabled={busy || transcribing}
              onClick={toggleVoice}
              aria-label={voiceLabel}
              aria-pressed={recording}
              className={cn(iconButton, recording && "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700")}
            >
              {transcribing ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Mic className={cn("size-5", recording && "animate-pulse")} />}
            </button>
          )}
          {roundIsVoice ? (
            <button
              type="button"
              disabled={busy || transcribing}
              onClick={toggleVoice}
              aria-label={voiceLabel}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:opacity-40",
                recording ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700",
              )}
            >
              {recording ? <Square className="size-4 fill-current" /> : <AudioLines className="size-5" />}
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Gửi"
              disabled={busy || !canSend || uploading || transcribing}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"
            >
              <ArrowUp className="size-5" />
            </button>
          )}
        </div>
      </form>
      {notice && (
        <p role="alert" className="mt-2 px-3 text-xs text-red-600">
          {notice}
        </p>
      )}
    </div>
  );
}
