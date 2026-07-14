-- CreateTable
CREATE TABLE "ManagedNarrative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'EN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManagedNarrative_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManagedNarrativeRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "narrativeId" TEXT NOT NULL,
    "sourceReportingPackId" TEXT,
    "revisionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "content" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "reviewNotes" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManagedNarrativeRevision_narrativeId_fkey" FOREIGN KEY ("narrativeId") REFERENCES "ManagedNarrative" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ManagedNarrativeRevision_sourceReportingPackId_fkey" FOREIGN KEY ("sourceReportingPackId") REFERENCES "ProjectReportingPack" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagedNarrative_projectId_objectKey_variant_language_key" ON "ManagedNarrative"("projectId", "objectKey", "variant", "language");
CREATE INDEX "ManagedNarrative_projectId_idx" ON "ManagedNarrative"("projectId");
CREATE UNIQUE INDEX "ManagedNarrativeRevision_narrativeId_revisionNumber_key" ON "ManagedNarrativeRevision"("narrativeId", "revisionNumber");
CREATE INDEX "ManagedNarrativeRevision_narrativeId_status_idx" ON "ManagedNarrativeRevision"("narrativeId", "status");
CREATE INDEX "ManagedNarrativeRevision_sourceReportingPackId_idx" ON "ManagedNarrativeRevision"("sourceReportingPackId");
