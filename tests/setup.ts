import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";
config({ path: ".env.local" });

// Test đơn vị/tích hợp không gọi OpenAI: dùng test double ở tests/helpers. AI thật được test ở tests/live.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
// Khóa ký phiên riêng cho test (không có khóa mặc định trong mã nguồn)
process.env.SESSION_SECRET ??= "test-session-secret-0123456789-abcdefghij";
