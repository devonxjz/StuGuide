/**
 * Chuyển giọng nói thành chữ bằng Whisper (OpenAI). Gọi REST trực tiếp: chỉ cần một endpoint nên không kéo thêm SDK.
 * Model đặt qua OPENAI_TRANSCRIBE_MODEL (mặc định whisper-1).
 */
export const DEFAULT_TRANSCRIBE_MODEL = "whisper-1";

/** Gợi ý từ vựng để Whisper viết đúng tên riêng/thuật ngữ mầm non thay vì đoán âm. */
const VOCAB_HINT = "Giáo án mầm non, trò chơi dân gian, STEM, lớp 4–5 tuổi, StuGuide, phụ huynh, nhật ký quan sát, phát triển vận động.";

/** MIME âm thanh mà MediaRecorder của các trình duyệt chính tạo ra, kèm đuôi tệp để OpenAI nhận dạng định dạng. */
export const AUDIO_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "video/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export interface TranscribeInput {
  bytes: Buffer;
  /** MIME đã chuẩn hóa (khóa của AUDIO_TYPES) */
  type: string;
}

export interface TranscribeOptions {
  apiKey: string;
  model?: string;
  language?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export class TranscribeError extends Error {}

export async function transcribeAudio(
  { bytes, type }: TranscribeInput,
  { apiKey, model = DEFAULT_TRANSCRIBE_MODEL, language = "vi", signal, fetchImpl = fetch }: TranscribeOptions,
): Promise<string> {
  const ext = AUDIO_TYPES[type];
  if (!ext) throw new TranscribeError(`Định dạng âm thanh không được hỗ trợ: ${type}`);

  const form = new FormData();
  form.set("file", new File([new Uint8Array(bytes)], `voice.${ext}`, { type }));
  form.set("model", model);
  form.set("language", language);
  form.set("prompt", VOCAB_HINT);
  form.set("response_format", "json");
  // Nhiệt độ 0: kết quả ổn định, ít "bịa" chữ khi có đoạn im lặng
  form.set("temperature", "0");

  const res = await fetchImpl("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal,
  });
  if (!res.ok) throw new TranscribeError(`Whisper trả về lỗi ${res.status}`);
  const data = (await res.json()) as { text?: unknown };
  return typeof data.text === "string" ? data.text.trim() : "";
}
