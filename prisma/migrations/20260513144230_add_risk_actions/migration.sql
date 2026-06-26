-- CreateTable
CREATE TABLE "ProjectRiskAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectRiskId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ownerId" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "evidence" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectRiskAction_projectRiskId_fkey" FOREIGN KEY ("projectRiskId") REFERENCES "ProjectRisk" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectRiskAction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProjectRiskAction_projectRiskId_idx" ON "ProjectRiskAction"("projectRiskId");

-- CreateIndex
CREATE INDEX "ProjectRiskAction_ownerId_idx" ON "ProjectRiskAction"("ownerId");
