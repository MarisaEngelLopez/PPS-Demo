/*
  Warnings:

  - You are about to drop the column `description` on the `TimeEntry` table. All the data in the column will be lost.
  - Added the required column `taskFamilyId` to the `TimeEntry` table without a default value. This is not possible if the table is not empty.
  - Made the column `projectWorkstreamId` on table `TimeEntry` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "projectWorkstreamId" TEXT NOT NULL,
    "taskFamilyId" TEXT NOT NULL,
    "projectTaskId" TEXT,
    "date" DATETIME NOT NULL,
    "hours" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_projectWorkstreamId_fkey" FOREIGN KEY ("projectWorkstreamId") REFERENCES "ProjectWorkstream" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_taskFamilyId_fkey" FOREIGN KEY ("taskFamilyId") REFERENCES "TaskFamily" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_projectTaskId_fkey" FOREIGN KEY ("projectTaskId") REFERENCES "ProjectTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TimeEntry" ("createdAt", "date", "hours", "id", "projectId", "projectWorkstreamId", "updatedAt") SELECT "createdAt", "date", "hours", "id", "projectId", "projectWorkstreamId", "updatedAt" FROM "TimeEntry";
DROP TABLE "TimeEntry";
ALTER TABLE "new_TimeEntry" RENAME TO "TimeEntry";
CREATE INDEX "TimeEntry_projectId_idx" ON "TimeEntry"("projectId");
CREATE INDEX "TimeEntry_projectWorkstreamId_idx" ON "TimeEntry"("projectWorkstreamId");
CREATE INDEX "TimeEntry_taskFamilyId_idx" ON "TimeEntry"("taskFamilyId");
CREATE INDEX "TimeEntry_projectTaskId_idx" ON "TimeEntry"("projectTaskId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
