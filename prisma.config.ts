import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import path from "node:path";

const configuredDatabaseUrl = env("DATABASE_URL");
const databaseUrl =
  configuredDatabaseUrl.startsWith("file:") &&
  !path.isAbsolute(configuredDatabaseUrl.slice(5))
    ? `file:${path
        .resolve(process.cwd(), configuredDatabaseUrl.slice(5))
        .replaceAll("\\", "/")}`
    : configuredDatabaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",   // 👈 ADD THIS LINE
  },
  datasource: {
    url: databaseUrl,
  },
});
