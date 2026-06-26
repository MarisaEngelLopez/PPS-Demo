/*
  Warnings:

  - You are about to drop the column `area` on the `StatusUsage` table. All the data in the column will be lost.
  - You are about to drop the column `isActiveState` on the `StatusUsage` table. All the data in the column will be lost.
  - Added the required column `scopeId` to the `StatusUsage` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "StatusScope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inheritDefault" BOOLEAN NOT NULL DEFAULT true
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StatusUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "statusId" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "isInProgress" BOOLEAN NOT NULL DEFAULT false,
    "isAttention" BOOLEAN NOT NULL DEFAULT false,
    "isPositive" BOOLEAN NOT NULL DEFAULT false,
    "isNegative" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "StatusUsage_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StatusUsage_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "StatusScope" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StatusUsage" ("id", "isActive", "isAttention", "isClosed", "isDefault", "isNegative", "isOpen", "isPositive", "sortOrder", "statusId") SELECT "id", "isActive", "isAttention", "isClosed", "isDefault", "isNegative", "isOpen", "isPositive", "sortOrder", "statusId" FROM "StatusUsage";
DROP TABLE "StatusUsage";
ALTER TABLE "new_StatusUsage" RENAME TO "StatusUsage";
CREATE INDEX "StatusUsage_scopeId_idx" ON "StatusUsage"("scopeId");
CREATE INDEX "StatusUsage_isActive_idx" ON "StatusUsage"("isActive");
CREATE UNIQUE INDEX "StatusUsage_statusId_scopeId_key" ON "StatusUsage"("statusId", "scopeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "StatusScope_code_key" ON "StatusScope"("code");
