import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/live/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "evals/lib/**/*.ts"],
      exclude: ["src/generated/**"],
      reporter: ["text-summary", "text"],
      // Ngưỡng tối thiểu cho các module quota AI và hiển thị câu trả lời AI (npm run test:coverage sẽ fail nếu tụt dưới mức này)
      thresholds: {
        perFile: true,
        "src/server/security/{ai-quota,device-id}.ts": { lines: 80, branches: 80, functions: 80, statements: 80 },
        "src/data/repositories/ai-quota.repo.ts": { lines: 80, branches: 80, functions: 80, statements: 80 },
        "src/app/api/device/quota/route.ts": { lines: 80, branches: 80, functions: 80, statements: 80 },
        "src/lib/{device-quota,api-client,api-error}.ts": { lines: 80, branches: 80, functions: 80, statements: 80 },
        "src/hooks/use-device-quota.ts": { lines: 80, branches: 80, functions: 80, statements: 80 },
        "src/{proxy,server/http}.ts": { lines: 80, branches: 80, functions: 80, statements: 80 },
        "evals/lib/*.ts": { lines: 80, branches: 80, functions: 80, statements: 80 },
        "src/{lib/markdown.ts,components/shared/markdown-text.tsx}": { lines: 80, branches: 80, functions: 80, statements: 80 },
      },
    },
  },
});
