-- Remove legacy risk status bridge after ProjectRisk.statusId became the source of truth.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ProjectRisk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "projectWorkstreamId" TEXT,
    "categoryId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "ownerId" TEXT,
    "riskCode" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "probability" INTEGER NOT NULL DEFAULT 3,
    "impact" INTEGER NOT NULL DEFAULT 3,
    "exposure" INTEGER NOT NULL DEFAULT 9,
    "identifiedDate" DATETIME,
    "targetResolutionDate" DATETIME,
    "mitigationPlan" TEXT,
    "contingencyPlan" TEXT,
    "trigger" TEXT,
    "notes" TEXT,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectRisk_projectWorkstreamId_fkey" FOREIGN KEY ("projectWorkstreamId") REFERENCES "ProjectWorkstream" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectRisk_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RiskCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectRisk_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectRisk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_ProjectRisk" (
    "id",
    "projectId",
    "projectWorkstreamId",
    "categoryId",
    "statusId",
    "ownerId",
    "riskCode",
    "title",
    "description",
    "probability",
    "impact",
    "exposure",
    "identifiedDate",
    "targetResolutionDate",
    "mitigationPlan",
    "contingencyPlan",
    "trigger",
    "notes",
    "escalated",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "projectId",
    "projectWorkstreamId",
    "categoryId",
    "statusId",
    "ownerId",
    "riskCode",
    "title",
    "description",
    "probability",
    "impact",
    "exposure",
    "identifiedDate",
    "targetResolutionDate",
    "mitigationPlan",
    "contingencyPlan",
    "trigger",
    "notes",
    "escalated",
    "isActive",
    "createdAt",
    "updatedAt"
FROM "ProjectRisk";

DROP TABLE "ProjectRisk";
ALTER TABLE "new_ProjectRisk" RENAME TO "ProjectRisk";
DROP TABLE "RiskStatus";

CREATE UNIQUE INDEX "ProjectRisk_riskCode_key" ON "ProjectRisk"("riskCode");
CREATE INDEX "ProjectRisk_projectId_idx" ON "ProjectRisk"("projectId");
CREATE INDEX "ProjectRisk_projectWorkstreamId_idx" ON "ProjectRisk"("projectWorkstreamId");
CREATE INDEX "ProjectRisk_categoryId_idx" ON "ProjectRisk"("categoryId");
CREATE INDEX "ProjectRisk_statusId_idx" ON "ProjectRisk"("statusId");
CREATE INDEX "ProjectRisk_ownerId_idx" ON "ProjectRisk"("ownerId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
