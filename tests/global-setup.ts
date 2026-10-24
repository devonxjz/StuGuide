import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

export default function setup() {
  const dir = path.resolve(import.meta.dirname, ".tmp");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const template = path.join(dir, "template.db");
  execSync("npx prisma db push", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: `file:${template}` },
  });
}
