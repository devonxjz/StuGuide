import type { QuotaEntry } from "@/data/repositories/ai-quota.repo";

/**
 * Quota AI dùng thử (bản MVP). Request AI chỉ được chạy khi MỌI bộ đếm của nó còn lượt:
 *  1. Thiết bị – "device:<id>": id lấy từ cookie có chữ ký do server cấp (device-id.ts), tối đa DEVICE_AI_LIMIT lượt.
 *  2. Mạng     – "ip:<mạng>": tối đa IP_AI_LIMIT lượt, chặn việc xóa cookie để nhận "thiết bị mới" lặp lại.
 *
 * File này chỉ có hàm thuần. Đọc/ghi số lượt: src/data/repositories/ai-quota.repo.ts.
 * Áp dụng cho request: route() trong src/server/http.ts.
 */

// ── 1. Cấu hình ─────────────────────────────────────────────────────────────

/** Đọc giới hạn từ biến môi trường; thiếu, sai hoặc không phải số nguyên dương thì dùng giá trị mặc định. */
export function parseLimit(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export const DEVICE_AI_LIMIT = parseLimit(process.env.DEVICE_AI_LIMIT, 5);
/** Đủ cho vài máy dùng chung một Wi-Fi */
export const IP_AI_LIMIT = parseLimit(process.env.IP_AI_LIMIT, 15);

export interface QuotaStatus {
  limit: number;
  used: number;
  remaining: number;
  isExceeded: boolean;
}

// ── 2. Quy IP về "mạng" ─────────────────────────────────────────────────────

const IPV4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/;

/** Bung dạng rút gọn của IPv6 thành đủ 8 nhóm: "2001:db8::1" → ["2001", "db8", "0", "0", "0", "0", "0", "1"] */
function expandIpv6(address: string): string[] {
  const [head, tail] = address.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const zeros = Array<string>(Math.max(0, 8 - left.length - right.length)).fill("0");
  return [...left, ...zeros, ...right];
}

/**
 * Khóa mạng của một IP:
 *  - IPv4 (kể cả dạng IPv4-mapped "::ffff:a.b.c.d"): giữ nguyên địa chỉ.
 *  - IPv6: gộp theo dải /64, vì một thuê bao thường được cấp cả dải; đổi địa chỉ trong dải vẫn là cùng một mạng.
 *  - Giá trị không phải IP (vd. "local" khi chạy dev không qua reverse proxy): giữ nguyên.
 */
export function networkKey(ip: string): string {
  const value = ip.trim().toLowerCase();

  const ipv4 = IPV4.exec(value);
  if (ipv4) return ipv4[1];
  if (!value.includes(":")) return value;

  const address = value.split("%")[0]; // bỏ zone id, vd. "fe80::1%eth0"
  const prefix = expandIpv6(address)
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, "")); // "0db8" → "db8", "0000" → "0"
  return `${prefix.join(":")}::/64`;
}

// ── 3. Các bộ đếm của một request ───────────────────────────────────────────

/** Không có id thiết bị hợp lệ (thiếu cookie, cookie giả, gọi bằng curl…) thì chỉ còn bộ đếm mạng. */
export function quotaEntries(deviceId: string | null, ip: string): QuotaEntry[] {
  const network: QuotaEntry = { key: `ip:${networkKey(ip)}`, limit: IP_AI_LIMIT };
  if (!deviceId) return [network];
  return [{ key: `device:${deviceId}`, limit: DEVICE_AI_LIMIT }, network];
}

// ── 4. Trạng thái hiển thị cho người dùng ──────────────────────────────────

/**
 * Gộp các bộ đếm thành một con số trên thang DEVICE_AI_LIMIT. Lượt còn lại là của bộ đếm cạn nhất.
 * Khóa chưa có trong `usage` coi như chưa dùng; dùng quá trần (vd. vừa hạ giới hạn) vẫn hiện 0 lượt còn lại.
 */
export function toQuotaStatus(entries: QuotaEntry[], usage: Map<string, number>): QuotaStatus {
  const leftPerCounter = entries.map((entry) => entry.limit - (usage.get(entry.key) ?? 0));
  const remaining = Math.max(0, Math.min(DEVICE_AI_LIMIT, ...leftPerCounter));
  return { limit: DEVICE_AI_LIMIT, used: DEVICE_AI_LIMIT - remaining, remaining, isExceeded: remaining === 0 };
}
