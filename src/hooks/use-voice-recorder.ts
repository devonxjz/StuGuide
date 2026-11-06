"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { uploadFile } from "@/lib/api-client";
import { userMessage } from "@/lib/api-error";

/** Thứ tự ưu tiên định dạng: Chrome/Edge/Firefox ghi webm-opus, Safari ghi mp4 (đều nhỏ, Whisper đọc được). */
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
/** Giọng nói nén opus 32 kbps ≈ 4 KB/giây: đủ cho nhận dạng, nhỏ để tải lên nhanh */
const AUDIO_BITS_PER_SECOND = 32_000;
/** Tự dừng sau 2 phút để không gửi đoạn ghi quên tắt */
export const MAX_RECORD_MS = 120_000;
/** Dưới ngưỡng này coi là bấm nhầm (không có lời nói) */
export const MIN_RECORD_MS = 600;

export type VoiceState = "idle" | "recording" | "transcribing";

const noSubscribe = () => () => {};
const canRecord = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";

const pickMimeType = () => MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
const extensionOf = (mime: string) => (mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm");

function micErrorMessage(err: unknown) {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Chưa cho phép dùng micro. Cô bấm vào biểu tượng ổ khóa cạnh địa chỉ trang để bật micro nhé.";
  if (name === "NotFoundError") return "Không tìm thấy micro trên thiết bị này.";
  return "Không mở được micro, cô thử lại giúp mình nhé.";
}

/**
 * Ghi âm bằng micro rồi gửi lên server để Whisper chuyển thành chữ (chính xác hơn nhiều so với nhận dạng của trình duyệt,
 * chạy đồng đều trên mọi trình duyệt). Bấm lần 1 để ghi, bấm lần 2 để dừng và chuyển chữ.
 */
export function useVoiceRecorder({ onTranscript, onError }: { onTranscript: (text: string) => void; onError: (message: string) => void }) {
  const supported = useSyncExternalStore(noSubscribe, canRecord, () => false);
  const [state, setState] = useState<VoiceState>("idle");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Hủy (gỡ component): dừng ghi mà không chuyển chữ */
  const discardRef = useRef(false);
  const callbacks = useRef({ onTranscript, onError });

  useEffect(() => {
    callbacks.current = { onTranscript, onError };
  }, [onTranscript, onError]);

  const release = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const transcribe = useCallback(async (blob: Blob, mime: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setState("transcribing");
    try {
      const { text } = await uploadFile<{ text: string }>("/api/chat/transcribe", blob, `voice.${extensionOf(mime)}`, controller.signal);
      if (text.trim()) callbacks.current.onTranscript(text.trim());
      else callbacks.current.onError("Mình chưa nghe rõ, cô nói lại giúp mình nhé.");
    } catch (err) {
      if (!controller.signal.aborted) callbacks.current.onError(userMessage(err, "Không chuyển được giọng nói thành chữ, cô thử lại nhé."));
    } finally {
      abortRef.current = null;
      setState("idle");
    }
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current || !canRecord()) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (err) {
      callbacks.current.onError(micErrorMessage(err));
      return;
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: AUDIO_BITS_PER_SECOND });
    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];
    discardRef.current = false;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const mime = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mime });
      const duration = Date.now() - startedAtRef.current;
      release();
      if (discardRef.current) return;
      if (duration < MIN_RECORD_MS || blob.size === 0) {
        setState("idle");
        return;
      }
      void transcribe(blob, mime);
    };

    startedAtRef.current = Date.now();
    recorder.start();
    setState("recording");
    timerRef.current = setTimeout(stop, MAX_RECORD_MS);
  }, [release, stop, transcribe]);

  useEffect(
    () => () => {
      discardRef.current = true;
      abortRef.current?.abort();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      else release();
    },
    [release],
  );

  return { supported, state, start, stop };
}
