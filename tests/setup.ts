import "@testing-library/jest-dom/vitest";

// Test đơn vị/tích hợp không gọi OpenAI: dùng test double ở tests/helpers. AI thật được test ở tests/live.
process.env.DATABASE_URL = "file:./test.db";
// Khóa ký phiên riêng cho test (không có khóa mặc định trong mã nguồn)
process.env.SESSION_SECRET ??= "test-session-secret-0123456789-abcdefghij";
