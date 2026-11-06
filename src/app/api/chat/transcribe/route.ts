import { AppError, InputError } from "@/core/errors";
import { resolveAiConfig } from "@/ai/config";
import { AUDIO_TYPES, TranscribeError, transcribeAudio } from "@/ai/transcribe";
import { route } from "@/server/http";
import { readUploadedFile } from "@/server/security/input";

export const maxDuration = 60;

/** Ghi âm tối đa ~3 phút ở 32 kbps ≈ 1 MB; trần 4 MB cho các trình duyệt ghi bitrate cao hơn. */
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

/**
 * Giọng nói → chữ (Whisper). Âm thanh chỉ đi qua server để gọi OpenAI, không được lưu.
 */
export const POST = route({ auth: ["teacher"], rateLimit: "ai" }, async ({ req }) => {
  const audio = await readUploadedFile(req, MAX_AUDIO_BYTES);
  if (!(audio.type in AUDIO_TYPES)) throw new InputError("Định dạng âm thanh không được hỗ trợ", 415);

  const config = resolveAiConfig();
  try {
    const text = await transcribeAudio(audio, { apiKey: config.apiKey, model: process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || undefined, signal: req.signal });
    return { text };
  } catch (e) {
    if (e instanceof TranscribeError) throw new AppError("ERR-STT-01", "Không chuyển được giọng nói thành chữ, cô thử nói lại giúp mình nhé", 502);
    throw e;
  }
});
