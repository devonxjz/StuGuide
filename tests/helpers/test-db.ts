import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { seedDemoData } from "@/data/seed/demo-data";

const ddl = () => readFileSync(path.resolve(import.meta.dirname, "..", ".tmp", "template.sql"), "utf8");

/** Mỗi file test có một schema Postgres riêng (tạo từ DDL của schema.prisma). */
export async function createTestDb(opts: { seed?: boolean } = { seed: true }) {
  const url = (process.env.TEST_DATABASE_URL || process.env.DATABASE_URL)!;
  const schema = `t_${randomUUID().replace(/-/g, "")}`;

  const admin = new Pool({ connectionString: url, max: 1 });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const client = await admin.connect();
  try {
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(ddl());
  } finally {
    client.release();
    await admin.end();
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }, { schema }) });
  const ids = opts.seed === false ? null : await seedDemoData(prisma);
  return { prisma, ids: ids as Awaited<ReturnType<typeof seedDemoData>> };
}
