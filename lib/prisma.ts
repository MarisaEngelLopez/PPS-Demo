import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:../dev.db",
});

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const cachedPrisma = globalForPrisma.prisma;
const cachedPrismaSupportsCurrentSchema =
  cachedPrisma &&
  "agentDefinition" in cachedPrisma &&
  "evidenceType" in cachedPrisma &&
  "riskActionEvidence" in cachedPrisma &&
  "riskAssessment" in cachedPrisma &&
  "riskReview" in cachedPrisma &&
  "riskReviewType" in cachedPrisma &&
  "riskReviewOutcome" in cachedPrisma &&
  "customerDna" in cachedPrisma &&
  "executiveIntelligence" in cachedPrisma;

export const prisma =
  (cachedPrismaSupportsCurrentSchema ? cachedPrisma : undefined) ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
