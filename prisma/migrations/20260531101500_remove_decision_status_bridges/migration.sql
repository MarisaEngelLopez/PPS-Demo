-- Remove ProjectDecision text status and ProjectStatus bridge after statusId backfill.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ProjectDecision" (
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
    "statusId" TEXT NOT NULL,
    "impact" TEXT NOT NULL DEFAULT 'MEDIUM',
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT NOT NULL DEFAULT 'EXECUTIVE',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectDecision_projectWorkstreamId_fkey" FOREIGN KEY ("projectWorkstreamId") REFERENCES "ProjectWorkstream" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectDecision_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_ProjectDecision" (
    "id",
    "projectId",
    "projectWorkstreamId",
    "decisionCode",
    "title",
    "description",
    "recommendation",
    "decision",
    "requestedBy",
    "owner",
    "decisionDate",
    "dueDate",
    "statusId",
    "impact",
    "escalated",
    "visibility",
    "notes",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "projectId",
    "projectWorkstreamId",
    "decisionCode",
    "title",
    "description",
    "recommendation",
    "decision",
    "requestedBy",
    "owner",
    "decisionDate",
    "dueDate",
    "statusId",
    "impact",
    "escalated",
    "visibility",
    "notes",
    "isActive",
    "createdAt",
    "updatedAt"
FROM "ProjectDecision"
WHERE "statusId" IS NOT NULL;

DROP TABLE "ProjectDecision";
ALTER TABLE "new_ProjectDecision" RENAME TO "ProjectDecision";

CREATE UNIQUE INDEX "ProjectDecision_decisionCode_key" ON "ProjectDecision"("decisionCode");
CREATE INDEX "ProjectDecision_projectId_idx" ON "ProjectDecision"("projectId");
CREATE INDEX "ProjectDecision_projectWorkstreamId_idx" ON "ProjectDecision"("projectWorkstreamId");
CREATE INDEX "ProjectDecision_statusId_idx" ON "ProjectDecision"("statusId");
CREATE INDEX "ProjectDecision_impact_idx" ON "ProjectDecision"("impact");
CREATE INDEX "ProjectDecision_dueDate_idx" ON "ProjectDecision"("dueDate");
CREATE INDEX "ProjectDecision_escalated_idx" ON "ProjectDecision"("escalated");
CREATE INDEX "ProjectDecision_visibility_idx" ON "ProjectDecision"("visibility");
CREATE INDEX "ProjectDecision_isActive_idx" ON "ProjectDecision"("isActive");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
