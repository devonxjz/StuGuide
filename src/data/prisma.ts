import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

export function createPrismaClient(url: string = process.env.DATABASE_URL ?? "file:./dev.db") {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

export type Db = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { __stuguidePrisma?: Db };

/** Singleton cho app (tránh tạo nhiều kết nối khi hot-reload). */
export function getPrisma(): Db {
  return (globalForPrisma.__stuguidePrisma ??= createPrismaClient());
}
