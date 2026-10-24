import { copyFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createPrismaClient } from "@/data/prisma";
import { seedDemoData } from "@/data/seed/demo-data";

const tmp = path.resolve(import.meta.dirname, "..", ".tmp");

/** Mỗi file test có một DB SQLite riêng, sao từ template đã push schema. */
export async function createTestDb(opts: { seed?: boolean } = { seed: true }) {
  const file = path.join(tmp, `${randomUUID()}.db`);
  copyFileSync(path.join(tmp, "template.db"), file);
  const prisma = createPrismaClient(`file:${file}`);
  const ids = opts.seed === false ? null : await seedDemoData(prisma);
  return { prisma, ids: ids as Awaited<ReturnType<typeof seedDemoData>> };
}
