-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProjectWorkstream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "workstreamId" TEXT NOT NULL,
    "statusId" TEXT,
    "governedStatusId" TEXT,
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
    CONSTRAINT "ProjectWorkstream_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ProjectStatus" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectWorkstream_governedStatusId_fkey" FOREIGN KEY ("governedStatusId") REFERENCES "Status" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjectWorkstream" ("actualEndDate", "actualQuantity", "actualStartDate", "createdAt", "customName", "deliverable", "endDate", "id", "isActive", "measureUnit", "notes", "objective", "plannedEndDate", "plannedQuantity", "plannedStartDate", "projectId", "quantityType", "reportingName", "startDate", "statusId", "updatedAt", "visibility", "workstreamId") SELECT "actualEndDate", "actualQuantity", "actualStartDate", "createdAt", "customName", "deliverable", "endDate", "id", "isActive", "measureUnit", "notes", "objective", "plannedEndDate", "plannedQuantity", "plannedStartDate", "projectId", "quantityType", "reportingName", "startDate", "statusId", "updatedAt", "visibility", "workstreamId" FROM "ProjectWorkstream";
DROP TABLE "ProjectWorkstream";
ALTER TABLE "new_ProjectWorkstream" RENAME TO "ProjectWorkstream";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
