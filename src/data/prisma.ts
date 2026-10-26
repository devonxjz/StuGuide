import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function resolveDatabaseUrl(): string {
  if (process.env.VERCEL) {
    const tmpDb = "/tmp/dev.db";
    let needsCopy = true;
    try {
      if (fs.existsSync(tmpDb) && fs.statSync(tmpDb).size > 0) {
        needsCopy = false;
        try {
          fs.chmodSync(tmpDb, 0o666);
        } catch {}
      }
    } catch {
      needsCopy = true;
    }

    if (needsCopy) {
      const candidates = [
        path.resolve(process.cwd(), "prisma/seed.db"),
        path.join(process.cwd(), "prisma", "seed.db"),
        path.resolve(process.cwd(), ".next/server/prisma/seed.db"),
        path.resolve(process.cwd(), "dev.db"),
      ];
      const templatePath = candidates.find((p) => {
        try {
          return fs.existsSync(p) && fs.statSync(p).size > 0;
        } catch {
          return false;
        }
      });
      if (templatePath) {
        try {
          fs.copyFileSync(templatePath, tmpDb);
          fs.chmodSync(tmpDb, 0o666);
          console.log(`[prisma] Copied seed db from ${templatePath} to ${tmpDb} with rw permissions`);
        } catch (copyErr) {
          console.error(`[prisma] Failed to copy seed db:`, copyErr);
        }
      } else {
        console.warn(`[prisma] Seed db not found in candidates:`, candidates);
      }
    }
    return `file:${tmpDb}`;
  }

  // Cục bộ hoặc VPS
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("file:")) return process.env.DATABASE_URL;
  return process.env.DATABASE_URL ?? "file:./dev.db";
}

export function createPrismaClient(url: string = resolveDatabaseUrl()) {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

export type Db = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { __stuguidePrisma?: Db };

/** Singleton cho app (tránh tạo nhiều kết nối khi hot-reload). */
export function getPrisma(): Db {
  return (globalForPrisma.__stuguidePrisma ??= createPrismaClient());
}
