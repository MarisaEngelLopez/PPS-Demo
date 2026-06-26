-- CreateTable
CREATE TABLE "ProjectDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "projectWorkstreamId" TEXT,
    "decisionCode" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "recommendation" TEXT,
    "decision" TEXT,
    "requestedBy" TEXT,
    "owner" TEXT,
    "decisionDate" DATETIME,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "impact" TEXT NOT NULL DEFAULT 'MEDIUM',
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT NOT NULL DEFAULT 'EXECUTIVE',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectDecision_projectWorkstreamId_fkey" FOREIGN KEY ("projectWorkstreamId") REFERENCES "ProjectWorkstream" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProjectDecision_projectId_idx" ON "ProjectDecision"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDecision_projectWorkstreamId_idx" ON "ProjectDecision"("projectWorkstreamId");

-- CreateIndex
CREATE INDEX "ProjectDecision_status_idx" ON "ProjectDecision"("status");

-- CreateIndex
CREATE INDEX "ProjectDecision_impact_idx" ON "ProjectDecision"("impact");

-- CreateIndex
CREATE INDEX "ProjectDecision_dueDate_idx" ON "ProjectDecision"("dueDate");

-- CreateIndex
CREATE INDEX "ProjectDecision_escalated_idx" ON "ProjectDecision"("escalated");

-- CreateIndex
CREATE INDEX "ProjectDecision_visibility_idx" ON "ProjectDecision"("visibility");

-- CreateIndex
CREATE INDEX "ProjectDecision_isActive_idx" ON "ProjectDecision"("isActive");
