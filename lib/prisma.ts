import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

function resolveDatabaseUrl(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:") || path.isAbsolute(databaseUrl.slice(5))) {
    return databaseUrl;
  }

  return `file:${path.resolve(process.cwd(), databaseUrl.slice(5)).replaceAll("\\", "/")}`;
}

const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL);
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDatabaseUrl?: string;
};

const cachedPrisma = globalForPrisma.prisma;
const cachedPrismaSupportsCurrentSchema =
  cachedPrisma &&
  globalForPrisma.prismaDatabaseUrl === databaseUrl &&
  "agentDefinition" in cachedPrisma &&
  "evidenceType" in cachedPrisma &&
  "riskActionEvidence" in cachedPrisma &&
  "riskAssessment" in cachedPrisma &&
  "riskReview" in cachedPrisma &&
  "riskReviewType" in cachedPrisma &&
  "riskReviewOutcome" in cachedPrisma &&
  "customerDna" in cachedPrisma &&
  "executiveIntelligence" in cachedPrisma &&
  "managedNarrative" in cachedPrisma;

export const prisma =
  (cachedPrismaSupportsCurrentSchema ? cachedPrisma : undefined) ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDatabaseUrl = databaseUrl;
}
