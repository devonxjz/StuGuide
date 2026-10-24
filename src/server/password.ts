import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const KEY_LENGTH = 32;
const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/** Băm mật khẩu bằng scrypt với salt riêng: "salt:hash" (hex). Đồng bộ: chỉ dùng khi seed/tạo tài khoản. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, KEY_LENGTH).toString("hex")}`;
}

/** Hash giả cố định để tài khoản không tồn tại vẫn tốn cùng thời gian băm (không lộ tài khoản nào có thật qua thời gian phản hồi). */
const DUMMY_HASH = hashPassword(randomBytes(16).toString("hex"));

/** Xác minh bất đồng bộ (không chặn event loop khi nhiều người đăng nhập cùng lúc). */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const target = stored && /^[0-9a-f]{32}:[0-9a-f]{64}$/i.test(stored) ? stored : DUMMY_HASH;
  const [saltHex, hashHex] = target.split(":");
  const actual = await scryptAsync(password || "", Buffer.from(saltHex, "hex"), KEY_LENGTH);
  const ok = timingSafeEqual(actual, Buffer.from(hashHex, "hex"));
  return ok && target === stored && password.length > 0;
}
