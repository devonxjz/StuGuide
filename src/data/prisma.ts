import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.VERCEL) {
    const tmpDb = "/tmp/dev.db";
    if (!fs.existsSync(tmpDb)) {
      const templatePath = path.resolve(process.cwd(), "prisma/seed.db");
      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, tmpDb);
      }
    }
    return `file:${tmpDb}`;
  }
  return "file:./dev.db";
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
