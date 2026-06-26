-- CreateTable
CREATE TABLE "RiskCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEs" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "RiskStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEs" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ProjectRisk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "projectWorkstreamId" TEXT,
    "categoryId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "ownerId" TEXT,
    "riskCode" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "probability" INTEGER NOT NULL DEFAULT 3,
    "impact" INTEGER NOT NULL DEFAULT 3,
    "exposure" INTEGER NOT NULL DEFAULT 9,
    "identifiedDate" DATETIME,
    "targetResolutionDate" DATETIME,
    "mitigationPlan" TEXT,
    "contingencyPlan" TEXT,
    "trigger" TEXT,
    "notes" TEXT,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectRisk_projectWorkstreamId_fkey" FOREIGN KEY ("projectWorkstreamId") REFERENCES "ProjectWorkstream" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectRisk_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RiskCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectRisk_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "RiskStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectRisk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskCategory_code_key" ON "RiskCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RiskStatus_code_key" ON "RiskStatus"("code");

-- CreateIndex
CREATE INDEX "ProjectRisk_projectId_idx" ON "ProjectRisk"("projectId");

-- CreateIndex
CREATE INDEX "ProjectRisk_projectWorkstreamId_idx" ON "ProjectRisk"("projectWorkstreamId");

-- CreateIndex
CREATE INDEX "ProjectRisk_categoryId_idx" ON "ProjectRisk"("categoryId");

-- CreateIndex
CREATE INDEX "ProjectRisk_statusId_idx" ON "ProjectRisk"("statusId");

-- CreateIndex
CREATE INDEX "ProjectRisk_ownerId_idx" ON "ProjectRisk"("ownerId");
