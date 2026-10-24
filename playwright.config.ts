import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", locale: "vi-VN" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 860 } } }],
  webServer: {
    // DB riêng; AI thật qua OPENAI_API_KEY trong .env.local (Next tự nạp)
    command: `rm -f e2e.db e2e.db-journal && DATABASE_URL=file:./e2e.db npx prisma db push && next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: "file:./e2e.db", NEXT_DIST_DIR: ".next-e2e" },
  },
});
