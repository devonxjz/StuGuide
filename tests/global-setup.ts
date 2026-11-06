import { config } from "dotenv";

config({ path: ".env.local" });
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Sinh DDL một lần từ schema.prisma; mỗi file test chạy lại DDL này trong schema Postgres riêng. */
export default function setup() {
  process.env.TEST_DATABASE_URL ||= process.env.DATABASE_URL;
  if (!process.env.TEST_DATABASE_URL) throw new Error("Thiếu DATABASE_URL (hoặc TEST_DATABASE_URL) trong .env.local.");
  const dir = path.resolve(import.meta.dirname, ".tmp");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ddl = execFileSync(
    "npx",
    ["prisma", "migrate", "diff", "--from-empty", "--to-schema", "prisma/schema.prisma", "--script"],
    { encoding: "utf8" },
  );
  writeFileSync(path.join(dir, "template.sql"), ddl);
}

/** Dọn các schema t_* mà test đã tạo. */
export async function teardown() {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 1 });
  try {
    const { rows } = await pool.query("SELECT nspname FROM pg_namespace WHERE nspname LIKE 't\\_%'");
    for (const { nspname } of rows) await pool.query(`DROP SCHEMA "${nspname}" CASCADE`);
  } finally {
    await pool.end();
  }
}
