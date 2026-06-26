-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "displayName" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "country" TEXT,
    "organizationType" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrganizationContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isSponsor" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrganizationContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "plannedStartDate" DATETIME,
    "plannedEndDate" DATETIME,
    "actualStartDate" DATETIME,
    "actualEndDate" DATETIME,
    "issuerOrganizationId" TEXT,
    "clientOrganizationId" TEXT,
    "deliveryOrganizationId" TEXT,
    "sponsorContactId" TEXT,
    "showIssuerLogo" BOOLEAN NOT NULL DEFAULT true,
    "showClientLogo" BOOLEAN NOT NULL DEFAULT true,
    "showDeliveryLogo" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Project_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES "ProjectType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ProjectStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_issuerOrganizationId_fkey" FOREIGN KEY ("issuerOrganizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_deliveryOrganizationId_fkey" FOREIGN KEY ("deliveryOrganizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_sponsorContactId_fkey" FOREIGN KEY ("sponsorContactId") REFERENCES "OrganizationContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("actualEndDate", "actualStartDate", "createdAt", "defaultLanguage", "description", "descriptionEs", "healthStatus", "id", "isActive", "name", "nameEs", "plannedEndDate", "plannedStartDate", "projectCode", "projectManagerId", "projectTypeId", "reportLanguageMode", "reportingCadence", "secondaryLanguage", "sponsorId", "startDate", "statusId", "updatedAt") SELECT "actualEndDate", "actualStartDate", "createdAt", "defaultLanguage", "description", "descriptionEs", "healthStatus", "id", "isActive", "name", "nameEs", "plannedEndDate", "plannedStartDate", "projectCode", "projectManagerId", "projectTypeId", "reportLanguageMode", "reportingCadence", "secondaryLanguage", "sponsorId", "startDate", "statusId", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE INDEX "Organization_name_idx" ON "Organization"("name");

-- CreateIndex
CREATE INDEX "Organization_organizationType_idx" ON "Organization"("organizationType");

-- CreateIndex
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");

-- CreateIndex
CREATE INDEX "OrganizationContact_organizationId_idx" ON "OrganizationContact"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationContact_email_idx" ON "OrganizationContact"("email");

-- CreateIndex
CREATE INDEX "OrganizationContact_isSponsor_idx" ON "OrganizationContact"("isSponsor");

-- CreateIndex
CREATE INDEX "OrganizationContact_isActive_idx" ON "OrganizationContact"("isActive");
