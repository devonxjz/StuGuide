import type { Db } from "../prisma";

/** Một bộ đếm lượt AI: `key` vd. "device:<id>" hoặc "ip:<mạng>", `limit` là số lượt tối đa. */
export interface QuotaEntry {
  key: string;
  limit: number;
}

/**
 * Bộ đếm lượt AI lưu trong bảng AiQuota (không lưu RAM/cookie: client không xóa được, khởi động lại server không mất).
 * Luật giới hạn nằm ở src/server/security/ai-quota.ts; repo chỉ đọc và trừ lượt.
 */
export function createAiQuotaRepo(db: Db) {
  /** Khóa lần đầu xuất hiện được tạo với 0 lượt đã dùng */
  const ensureRows = (keys: string[]) => db.$transaction(keys.map((key) => db.aiQuota.upsert({ where: { key }, create: { key }, update: {} })));

  /** Trừ 1 lượt nếu còn. UPDATE có điều kiện `used < limit` là nguyên tử nên request song song không vượt trần. */
  const takeOne = async ({ key, limit }: QuotaEntry) => {
    const { count } = await db.aiQuota.updateMany({ where: { key, used: { lt: limit } }, data: { used: { increment: 1 } } });
    return count === 1;
  };

  const giveBack = (keys: string[]) => db.aiQuota.updateMany({ where: { key: { in: keys } }, data: { used: { decrement: 1 } } });

  return {
    /** Số lượt đã dùng theo từng khóa; khóa chưa có bản ghi = 0. */
    async usage(keys: string[]): Promise<Map<string, number>> {
      const rows = await db.aiQuota.findMany({ where: { key: { in: keys } } });
      const usedByKey = new Map(rows.map((row) => [row.key, row.used]));
      return new Map(keys.map((key) => [key, usedByKey.get(key) ?? 0]));
    },

    /**
     * Trừ 1 lượt trên MỌI bộ đếm, hoặc không trừ bộ đếm nào (all-or-nothing).
     * Trả về false khi có bộ đếm đã cạn.
     */
    async consume(entries: QuotaEntry[]): Promise<boolean> {
      await ensureRows(entries.map((entry) => entry.key));

      const taken: string[] = [];
      for (const entry of entries) {
        if (!(await takeOne(entry))) {
          // bộ đếm này đã cạn: hoàn lại lượt vừa trừ ở các bộ đếm trước
          if (taken.length > 0) await giveBack(taken);
          return false;
        }
        taken.push(entry.key);
      }
      return true;
    },
  };
}
