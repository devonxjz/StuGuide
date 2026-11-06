import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
