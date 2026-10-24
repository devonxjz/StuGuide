import { defineConfig } from "vitest/config";
import path from "node:path";

/** Test với OpenAI thật (tốn API, chạy tuần tự): npm run test:live */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/live/setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    include: ["tests/live/**/*.test.ts"],
    testTimeout: 240_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
