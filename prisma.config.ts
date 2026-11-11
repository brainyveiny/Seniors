import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(__dirname, ".env"), override: true });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI uses session pooler; app runtime uses DATABASE_URL via PrismaPg adapter.
    // Falls back so `prisma generate` works on a fresh clone without a .env file.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://localhost:5432/seniors",
  },
});
