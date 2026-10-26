export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function getClientDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("sg_device_id");
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      const match = /(?:^|;\s*)sg_device_id=([^;]+)/.exec(document.cookie);
      if (match?.[1] && /^[A-Za-z0-9_-]{8,64}$/.test(match[1])) {
        id = match[1];
      } else {
        id = `dev-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      }
      localStorage.setItem("sg_device_id", id);
    }
    document.cookie = `sg_device_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
    return id;
  } catch {
    return "";
  }
}

function syncDeviceQuotaHeaders(headers: Headers, is429Exceeded = false) {
  if (typeof window === "undefined") return;
  try {
    const usedH = headers.get("x-device-ai-used");
    const limitH = headers.get("x-device-ai-limit");
    const remH = headers.get("x-device-ai-remaining");
    const isExceeded = is429Exceeded || (usedH && limitH && Number.parseInt(usedH, 10) >= Number.parseInt(limitH, 10));
    if (isExceeded) {
      localStorage.setItem("sg_device_blocked", "true");
    }
    if (usedH && limitH) {
      const quota = {
        limit: Number.parseInt(limitH, 10),
        used: isExceeded ? Number.parseInt(limitH, 10) : Number.parseInt(usedH, 10),
        remaining: isExceeded ? 0 : Number.parseInt(remH || "0", 10),
        isExceeded: Boolean(isExceeded),
        message: isExceeded ? "Quá hạn sử dụng, bạn phải mua thêm lượt" : null,
      };
      localStorage.setItem("sg_device_quota", JSON.stringify(quota));
      window.dispatchEvent(new CustomEvent("sg:device-quota-updated", { detail: quota }));
    } else if (is429Exceeded) {
      const quota = {
        limit: 5,
        used: 5,
        remaining: 0,
        isExceeded: true,
        message: "Quá hạn sử dụng, bạn phải mua thêm lượt",
      };
      localStorage.setItem("sg_device_quota", JSON.stringify(quota));
      window.dispatchEvent(new CustomEvent("sg:device-quota-updated", { detail: quota }));
    }
  } catch {}
}

/** fetch JSON cho client component; ném ApiError có mã lỗi nghiệp vụ (ERR-*) để UI hiển thị đúng thông điệp. */
export async function api<T = unknown>(url: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const deviceId = getClientDeviceId();
  const headers: Record<string, string> = {
    ...(init.body ? { "content-type": "application/json" } : {}),
    ...(deviceId ? { "x-device-id": deviceId } : {}),
    ...init.headers,
  };
  const res = await fetch(url, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  syncDeviceQuotaHeaders(res.headers, res.status === 429);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429 || data?.error?.code === "ERR-QUOTA-EXCEEDED") {
      syncDeviceQuotaHeaders(res.headers, true);
    }
    throw new ApiError(data?.error?.code ?? "ERR-INTERNAL", data?.error?.message ?? "Có lỗi xảy ra", res.status);
  }
  return data as T;
}

/**
 * POST rồi đọc phản hồi NDJSON (mỗi dòng một sự kiện) – dùng cho tác vụ AI dài có tiến trình thật.
 * Dòng {type:"error"} được ném thành ApiError; trả về dòng {type:"result"}.
 */
export async function apiStream<R>(url: string, body: unknown, onEvent: (event: { type: string; [k: string]: unknown }) => void): Promise<R> {
  const deviceId = getClientDeviceId();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(deviceId ? { "x-device-id": deviceId } : {}),
  };
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  syncDeviceQuotaHeaders(res.headers, res.status === 429);
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 429 || data?.error?.code === "ERR-QUOTA-EXCEEDED") {
      syncDeviceQuotaHeaders(res.headers, true);
    }
    throw new ApiError(data?.error?.code ?? "ERR-INTERNAL", data?.error?.message ?? "Có lỗi xảy ra", res.status);
  }
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
