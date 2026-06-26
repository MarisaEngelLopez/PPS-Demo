-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProjectTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectWorkstreamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "objective" TEXT,
    "deliverable" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'BOTH',
    "plannedStartDate" DATETIME,
    "plannedEndDate" DATETIME,
    "actualStartDate" DATETIME,
    "actualEndDate" DATETIME,
    "statusId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectTask_projectWorkstreamId_fkey" FOREIGN KEY ("projectWorkstreamId") REFERENCES "ProjectWorkstream" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectTask_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ProjectStatus" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjectTask" ("actualEndDate", "actualStartDate", "createdAt", "deliverable", "description", "id", "isActive", "name", "objective", "plannedEndDate", "plannedStartDate", "projectWorkstreamId", "statusId", "updatedAt", "visibility") SELECT "actualEndDate", "actualStartDate", "createdAt", "deliverable", "description", "id", "isActive", "name", "objective", "plannedEndDate", "plannedStartDate", "projectWorkstreamId", "statusId", "updatedAt", "visibility" FROM "ProjectTask";
DROP TABLE "ProjectTask";
ALTER TABLE "new_ProjectTask" RENAME TO "ProjectTask";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
