import { describe, it, expect, vi } from "vitest";
import { AUDIO_TYPES, TranscribeError, transcribeAudio } from "@/ai/transcribe";

const audio = { bytes: Buffer.from("fake-audio"), type: "audio/webm" };
const okFetch = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe("transcribeAudio (Whisper)", () => {
  it("gọi OpenAI với model whisper-1, tiếng Việt, gợi ý từ vựng và trả về chữ đã cắt khoảng trắng", async () => {
    const fetchImpl = okFetch({ text: "  Soạn trò chơi cho lớp lá  " });
    const text = await transcribeAudio(audio, { apiKey: "sk-test", fetchImpl });
    expect(text).toBe("Soạn trò chơi cho lớp lá");

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    const form = init.body as FormData;
    expect(form.get("model")).toBe("whisper-1");
    expect(form.get("language")).toBe("vi");
    expect(form.get("temperature")).toBe("0");
    expect(String(form.get("prompt"))).toContain("mầm non");
    const file = form.get("file") as File;
    expect(file.name).toBe("voice.webm");
    expect(file.type).toBe("audio/webm");
  });

  it("đổi được model/ngôn ngữ; mỗi MIME hỗ trợ có đuôi tệp riêng", async () => {
    const fetchImpl = okFetch({ text: "ok" });
    await transcribeAudio({ ...audio, type: "audio/mp4" }, { apiKey: "k", model: "gpt-4o-mini-transcribe", language: "en", fetchImpl });
    const form = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(form.get("model")).toBe("gpt-4o-mini-transcribe");
    expect(form.get("language")).toBe("en");
    expect((form.get("file") as File).name).toBe("voice.mp4");
    expect(Object.values(AUDIO_TYPES).every(Boolean)).toBe(true);
  });

  it("MIME lạ → lỗi trước khi gọi mạng; OpenAI lỗi → TranscribeError; phản hồi thiếu text → chuỗi rỗng", async () => {
    const fetchImpl = okFetch({ text: "x" });
    await expect(transcribeAudio({ ...audio, type: "application/pdf" }, { apiKey: "k", fetchImpl })).rejects.toBeInstanceOf(TranscribeError);
    expect(fetchImpl).not.toHaveBeenCalled();

    await expect(transcribeAudio(audio, { apiKey: "k", fetchImpl: okFetch({ error: "x" }, 429) })).rejects.toThrow("429");
    expect(await transcribeAudio(audio, { apiKey: "k", fetchImpl: okFetch({}) })).toBe("");
  });
});
