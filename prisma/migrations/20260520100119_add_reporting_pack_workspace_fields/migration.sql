-- CreateTable
CREATE TABLE "ProjectReportingPack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportingDate" DATETIME NOT NULL,
    "reportingPeriod" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "executiveSummary" TEXT,
    "achievements" TEXT,
    "issues" TEXT,
    "nextSteps" TEXT,
    "managementAsk" TEXT,
    "reportIndex" TEXT,
    "conclusion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectReportingPack_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProjectReportingPack_projectId_idx" ON "ProjectReportingPack"("projectId");

-- CreateIndex
CREATE INDEX "ProjectReportingPack_reportingDate_idx" ON "ProjectReportingPack"("reportingDate");

-- CreateIndex
CREATE INDEX "ProjectReportingPack_status_idx" ON "ProjectReportingPack"("status");
