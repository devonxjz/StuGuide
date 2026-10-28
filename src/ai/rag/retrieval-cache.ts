import { createHash } from "node:crypto";
import type { RetrieveParams } from "./retriever";

export const RETRIEVAL_CACHE_TTL_MS = 10 * 60 * 1000;
export const RETRIEVAL_CACHE_MAX_ENTRIES = 200;

/** Hash nội dung kho tri thức: đổi kho tri thức thì mọi khóa cũ tự vô hiệu. */
export const knowledgeVersion = (records: unknown): string => createHash("sha256").update(JSON.stringify(records)).digest("hex").slice(0, 16);

const normalizeQuery = (query: string) => query.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();

/** Khóa cache: (phiên bản kho, collection, query đã chuẩn hóa, topK, filter theo thứ tự khóa cố định). */
export function cacheKey(version: string, { query, collection, topK = 5, filter }: RetrieveParams): string {
  const sortedFilter = Object.fromEntries(Object.entries(filter ?? {}).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify([version, collection, normalizeQuery(query), topK, sortedFilter]);
}

interface Entry<T> {
  value: Promise<T>;
  expiresAt: number;
}

/**
 * Cache TTL nhỏ, giữ Promise để các truy vấn đồng thời giống nhau chỉ chạy một lần.
 * Kết quả lỗi không được giữ lại; quá số mục tối đa thì bỏ mục cũ nhất.
 */
export function createTtlCache<T>({ ttlMs = RETRIEVAL_CACHE_TTL_MS, maxEntries = RETRIEVAL_CACHE_MAX_ENTRIES, now = Date.now }: { ttlMs?: number; maxEntries?: number; now?: () => number } = {}) {
  const entries = new Map<string, Entry<T>>();

  return {
    get(key: string, load: () => Promise<T>): Promise<T> {
      const hit = entries.get(key);
      if (hit && hit.expiresAt > now()) return hit.value;

      entries.delete(key);
      const value = load();
      entries.set(key, { value, expiresAt: now() + ttlMs });
      value.catch(() => entries.get(key)?.value === value && entries.delete(key));
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value as string);
      return value;
    },
    get size() {
      return entries.size;
    },
  };
}
