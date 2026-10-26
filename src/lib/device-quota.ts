import { QUOTA_EXCEEDED_MESSAGE } from "@/core/constants/quota";
import { apiErrorFrom } from "./api-error";

/**
 * Số lượt AI dùng thử phía trình duyệt – CHỈ để hiển thị. Server mới là nơi quyết định chặn hay không,
 * client chỉ đọc lại con số server trả về (header X-Device-AI-* hoặc GET /api/device/quota).
 *
 * Luồng dữ liệu: phản hồi API → syncQuotaFromResponse → publishQuota (lưu cache + phát sự kiện) → useDeviceQuota cập nhật giao diện.
 */

// ── 1. Kiểu dữ liệu và giá trị mặc định ─────────────────────────────────────

export interface DeviceQuota {
  limit: number;
  used: number;
  remaining: number;
  isExceeded: boolean;
  message: string | null;
}

export const DEVICE_QUOTA_EVENT = "sg:device-quota-updated";
const CACHE_KEY = "sg_device_quota";

/** Hiển thị tạm trước khi server trả lời */
export const DEFAULT_QUOTA: DeviceQuota = { limit: 5, used: 0, remaining: 5, isExceeded: false, message: null };

export function makeQuota(limit: number, used: number, remaining: number): DeviceQuota {
  const isExceeded = remaining <= 0;
  return { limit, used, remaining: Math.max(0, remaining), isExceeded, message: isExceeded ? QUOTA_EXCEEDED_MESSAGE : null };
}

// ── 2. Lưu và phát số lượt mới ──────────────────────────────────────────────

/** Lưu vào localStorage (để lần tải trang sau hiện ngay) và báo cho mọi useDeviceQuota đang mở. */
export function publishQuota(quota: DeviceQuota) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(quota));
  } catch {
    // trình duyệt chặn localStorage (chế độ riêng tư…): vẫn phát sự kiện bình thường
  }
  window.dispatchEvent(new CustomEvent(DEVICE_QUOTA_EVENT, { detail: quota }));
}

const isQuota = (value: unknown): value is DeviceQuota => {
  const q = value as DeviceQuota | null;
  return typeof q?.limit === "number" && typeof q.used === "number" && typeof q.remaining === "number" && typeof q.isExceeded === "boolean";
};

/** Số lượt đã lưu từ lần trước; không có, hỏng hoặc đang render phía server thì dùng mặc định. */
export function readCachedQuota(): DeviceQuota {
  if (typeof window === "undefined") return DEFAULT_QUOTA;
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
    return isQuota(cached) ? cached : DEFAULT_QUOTA;
  } catch {
    return DEFAULT_QUOTA;
  }
}

/**
 * Key của bản cũ: cờ "khóa vĩnh viễn" (bị đặt nhầm cả khi 429 do bấm quá nhanh) và id thiết bị client tự sinh.
 * Bản mới không đọc tới nữa; xóa đi để máy đã dùng bản cũ không còn dữ liệu thừa.
 */
const LEGACY_KEYS = ["sg_device_blocked", "sg_device_id"];

export function clearLegacyStorage() {
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    // localStorage bị chặn: không có gì để dọn
  }
}

// ── 3. Đọc số lượt từ phản hồi API ──────────────────────────────────────────

/** Chỉ request AI mới có header X-Device-AI-*; phản hồi khác (kể cả 429 do bấm quá nhanh) trả về null. */
export function quotaFromHeaders(headers: Headers): DeviceQuota | null {
  const [limit, used, remaining] = ["x-device-ai-limit", "x-device-ai-used", "x-device-ai-remaining"].map((name) => Number.parseInt(headers.get(name) ?? "", 10));
  if ([limit, used, remaining].some(Number.isNaN)) return null;
  return makeQuota(limit, used, remaining);
}

/** Đọc số lượt chỉ là việc phụ để hiển thị: phản hồi không có header thì bỏ qua, không bao giờ làm hỏng request. */
export function syncQuotaFromResponse(res: { headers?: Headers }): DeviceQuota | null {
  const quota = res.headers ? quotaFromHeaders(res.headers) : null;
  if (quota) publishQuota(quota);
  return quota;
}

/**
 * fetch cho DefaultChatTransport: cập nhật số lượt sau mỗi phản hồi. Lỗi HTTP thì ném ApiError kèm mã và thông điệp
 * của server (hết lượt, bấm quá nhanh…); AI SDK chuyển nguyên lỗi này tới onError của useChat.
 */
export async function quotaAwareFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  syncQuotaFromResponse(res);
  if (!res.ok) throw await apiErrorFrom(res);
  return res;
}
