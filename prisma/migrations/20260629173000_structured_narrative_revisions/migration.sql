-- AlterTable
ALTER TABLE "ManagedNarrativeRevision" ADD COLUMN "documentJson" TEXT;
ALTER TABLE "ManagedNarrativeRevision" ADD COLUMN "evidenceJson" TEXT;
ALTER TABLE "ManagedNarrativeRevision" ADD COLUMN "presentationMode" TEXT NOT NULL DEFAULT 'AUTO';
ALTER TABLE "ManagedNarrativeRevision" ADD COLUMN "publishedAt" DATETIME;
