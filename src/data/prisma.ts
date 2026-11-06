import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Thiếu DATABASE_URL (chuỗi kết nối Postgres/Supabase). Xem .env.example.");
  return url;
}

export function createPrismaClient(url: string = requireDatabaseUrl()) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export type Db = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { __stuguidePrisma?: Db };

/** Singleton cho app (tránh tạo nhiều kết nối khi hot-reload). */
export function getPrisma(): Db {
  return (globalForPrisma.__stuguidePrisma ??= createPrismaClient());
}
