import { ApiError, apiErrorFrom } from "./api-error";
import { syncQuotaFromResponse } from "./device-quota";

export { ApiError };

/** fetch JSON cho client component; ném ApiError có mã lỗi nghiệp vụ (ERR-*) để UI hiển thị đúng thông điệp. */
export async function api<T = unknown>(url: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.body ? { "content-type": "application/json" } : {}),
    ...init.headers,
  };
  const res = await fetch(url, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  syncQuotaFromResponse(res);
  if (!res.ok) throw await apiErrorFrom(res);
  return (await res.json().catch(() => ({}))) as T;
}

/**
 * POST rồi đọc phản hồi NDJSON (mỗi dòng một sự kiện) – dùng cho tác vụ AI dài có tiến trình thật.
 * Dòng {type:"error"} được ném thành ApiError; trả về dòng {type:"result"}.
 */
export async function apiStream<R>(url: string, body: unknown, onEvent: (event: { type: string; [k: string]: unknown }) => void): Promise<R> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  syncQuotaFromResponse(res);
  if (!res.ok || !res.body) throw await apiErrorFrom(res);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let result: R | undefined;
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buffer += value;
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");
    for (const line of lines.filter((l) => l.trim())) {
      const event = JSON.parse(line) as { type: string; error?: { code?: string; message?: string }; [k: string]: unknown };
      if (event.type === "error") throw new ApiError(event.error?.code ?? "ERR-INTERNAL", event.error?.message ?? "Có lỗi xảy ra", 500);
      if (event.type === "result") result = event as R;
      onEvent(event);
    }
    if (done) break;
  }
  if (result === undefined) throw new ApiError("ERR-NET-01", "Kết nối bị gián đoạn, cô thử lại nhé", 502);
  return result;
}
