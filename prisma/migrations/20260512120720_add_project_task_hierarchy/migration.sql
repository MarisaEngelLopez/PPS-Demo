/*
  Warnings:

  - You are about to drop the column `deliverable` on the `ProjectTask` table. All the data in the column will be lost.
  - You are about to drop the column `objective` on the `ProjectTask` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProjectTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectWorkstreamId" TEXT NOT NULL,
    "parentTaskId" TEXT,
    "statusId" TEXT,
    "name" TEXT NOT NULL,
    "reportingName" TEXT,
    "description" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'BOTH',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "plannedStartDate" DATETIME,
    "plannedEndDate" DATETIME,
    "actualStartDate" DATETIME,
    "actualEndDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectTask_projectWorkstreamId_fkey" FOREIGN KEY ("projectWorkstreamId") REFERENCES "ProjectWorkstream" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectTask_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "ProjectTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectTask_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ProjectStatus" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjectTask" ("actualEndDate", "actualStartDate", "createdAt", "description", "id", "isActive", "name", "plannedEndDate", "plannedStartDate", "projectWorkstreamId", "sortOrder", "statusId", "updatedAt", "visibility") SELECT "actualEndDate", "actualStartDate", "createdAt", "description", "id", "isActive", "name", "plannedEndDate", "plannedStartDate", "projectWorkstreamId", "sortOrder", "statusId", "updatedAt", "visibility" FROM "ProjectTask";
DROP TABLE "ProjectTask";
ALTER TABLE "new_ProjectTask" RENAME TO "ProjectTask";
CREATE INDEX "ProjectTask_projectWorkstreamId_idx" ON "ProjectTask"("projectWorkstreamId");
CREATE INDEX "ProjectTask_parentTaskId_idx" ON "ProjectTask"("parentTaskId");
CREATE INDEX "ProjectTask_statusId_idx" ON "ProjectTask"("statusId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
