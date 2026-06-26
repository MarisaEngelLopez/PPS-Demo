-- Remove ProjectRiskAction.status text bridge after statusId backfill.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ProjectRiskAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectRiskId" TEXT NOT NULL,
    "actionCode" TEXT,
    "description" TEXT NOT NULL,
    "ownerId" TEXT,
    "dueDate" DATETIME,
    "statusId" TEXT NOT NULL,
    "evidence" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectRiskAction_projectRiskId_fkey" FOREIGN KEY ("projectRiskId") REFERENCES "ProjectRisk" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectRiskAction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectRiskAction_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_ProjectRiskAction" (
    "id",
    "projectRiskId",
    "actionCode",
    "description",
    "ownerId",
    "dueDate",
    "statusId",
    "evidence",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "projectRiskId",
    "actionCode",
    "description",
    "ownerId",
    "dueDate",
    "statusId",
    "evidence",
    "createdAt",
    "updatedAt"
FROM "ProjectRiskAction"
WHERE "statusId" IS NOT NULL;

DROP TABLE "ProjectRiskAction";
ALTER TABLE "new_ProjectRiskAction" RENAME TO "ProjectRiskAction";

CREATE UNIQUE INDEX "ProjectRiskAction_actionCode_key" ON "ProjectRiskAction"("actionCode");
CREATE INDEX "ProjectRiskAction_projectRiskId_idx" ON "ProjectRiskAction"("projectRiskId");
CREATE INDEX "ProjectRiskAction_ownerId_idx" ON "ProjectRiskAction"("ownerId");
CREATE INDEX "ProjectRiskAction_statusId_idx" ON "ProjectRiskAction"("statusId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
