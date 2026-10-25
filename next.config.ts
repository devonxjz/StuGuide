import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E dùng thư mục build riêng để chạy song song với dev server của người dùng
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./prisma/seed.db"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
