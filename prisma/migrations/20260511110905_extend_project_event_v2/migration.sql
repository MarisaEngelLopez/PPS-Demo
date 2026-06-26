-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProjectEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "eventTypeId" TEXT,
    "name" TEXT NOT NULL,
    "customName" TEXT,
    "reportingName" TEXT,
    "description" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'BOTH',
    "plannedQuantity" REAL,
    "actualQuantity" REAL,
    "measureUnit" TEXT,
    "quantityType" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completionDate" DATETIME,
    "eventDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectEvent_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjectEvent" ("createdAt", "eventDate", "eventTypeId", "id", "isActive", "name", "projectId", "updatedAt") SELECT "createdAt", "eventDate", "eventTypeId", "id", "isActive", "name", "projectId", "updatedAt" FROM "ProjectEvent";
DROP TABLE "ProjectEvent";
ALTER TABLE "new_ProjectEvent" RENAME TO "ProjectEvent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
