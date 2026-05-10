/*
  Warnings:

  - You are about to drop the `ProjectArchetype` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `archetypeId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `projectArchetypeId` on the `ProjectWorkstream` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ProjectArchetype_code_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProjectArchetype";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ProjectType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEs" TEXT,
    "description" TEXT,
    "descriptionEs" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEs" TEXT,
    "description" TEXT,
    "descriptionEs" TEXT,
    "projectTypeId" TEXT,
    "statusId" TEXT NOT NULL,
    "projectManagerId" TEXT NOT NULL,
    "sponsorId" TEXT,
    "startDate" DATETIME NOT NULL,
    "reportingCadence" TEXT NOT NULL,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'EN',
    "secondaryLanguage" TEXT,
    "reportLanguageMode" TEXT NOT NULL DEFAULT 'EN',
    "healthStatus" TEXT NOT NULL DEFAULT 'GREEN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES "ProjectType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ProjectStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("createdAt", "defaultLanguage", "description", "descriptionEs", "healthStatus", "id", "isActive", "name", "nameEs", "projectCode", "projectManagerId", "reportLanguageMode", "reportingCadence", "secondaryLanguage", "sponsorId", "startDate", "statusId", "updatedAt") SELECT "createdAt", "defaultLanguage", "description", "descriptionEs", "healthStatus", "id", "isActive", "name", "nameEs", "projectCode", "projectManagerId", "reportLanguageMode", "reportingCadence", "secondaryLanguage", "sponsorId", "startDate", "statusId", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");
CREATE TABLE "new_ProjectWorkstream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "workstreamId" TEXT NOT NULL,
    "statusId" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectTypeId" TEXT,
    CONSTRAINT "ProjectWorkstream_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectWorkstream_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "Workstream" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectWorkstream_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ProjectStatus" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectWorkstream_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES "ProjectType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjectWorkstream" ("createdAt", "endDate", "id", "notes", "projectId", "startDate", "statusId", "updatedAt", "workstreamId") SELECT "createdAt", "endDate", "id", "notes", "projectId", "startDate", "statusId", "updatedAt", "workstreamId" FROM "ProjectWorkstream";
DROP TABLE "ProjectWorkstream";
ALTER TABLE "new_ProjectWorkstream" RENAME TO "ProjectWorkstream";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectType_code_key" ON "ProjectType"("code");
