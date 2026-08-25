import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer loads .env implicitly, so do it here before env() is read.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // No .env on disk (e.g. CI with real environment variables) — that's fine.
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
