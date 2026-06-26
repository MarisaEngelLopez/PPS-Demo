-- CreateTable
CREATE TABLE "StatusUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "statusId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "isActiveState" BOOLEAN NOT NULL DEFAULT false,
    "isAttention" BOOLEAN NOT NULL DEFAULT false,
    "isPositive" BOOLEAN NOT NULL DEFAULT false,
    "isNegative" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "StatusUsage_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StatusUsage_area_idx" ON "StatusUsage"("area");

-- CreateIndex
CREATE INDEX "StatusUsage_isActive_idx" ON "StatusUsage"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StatusUsage_statusId_area_key" ON "StatusUsage"("statusId", "area");
