-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProjectWorkstream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "workstreamId" TEXT NOT NULL,
    "statusId" TEXT,
    "customName" TEXT,
    "reportingName" TEXT,
    "objective" TEXT,
    "deliverable" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'BOTH',
    "plannedQuantity" REAL,
    "actualQuantity" REAL,
    "measureUnit" TEXT,
    "quantityType" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "plannedStartDate" DATETIME,
    "plannedEndDate" DATETIME,
    "actualStartDate" DATETIME,
    "actualEndDate" DATETIME,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectWorkstream_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectWorkstream_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "Workstream" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectWorkstream_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ProjectStatus" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjectWorkstream" ("actualEndDate", "actualStartDate", "createdAt", "endDate", "id", "isActive", "notes", "plannedEndDate", "plannedStartDate", "projectId", "startDate", "statusId", "updatedAt", "workstreamId") SELECT "actualEndDate", "actualStartDate", "createdAt", "endDate", "id", "isActive", "notes", "plannedEndDate", "plannedStartDate", "projectId", "startDate", "statusId", "updatedAt", "workstreamId" FROM "ProjectWorkstream";
DROP TABLE "ProjectWorkstream";
ALTER TABLE "new_ProjectWorkstream" RENAME TO "ProjectWorkstream";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
