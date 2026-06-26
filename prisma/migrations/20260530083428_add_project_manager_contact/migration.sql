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
    "governedStatusId" TEXT,
    "issuerOrganizationId" TEXT,
    "clientOrganizationId" TEXT,
    "deliveryOrganizationId" TEXT,
    "projectManagerContactId" TEXT,
    "sponsorContactId" TEXT,
    "showIssuerLogo" BOOLEAN NOT NULL DEFAULT true,
    "showClientLogo" BOOLEAN NOT NULL DEFAULT true,
    "showDeliveryLogo" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Project_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES "ProjectType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ProjectStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_governedStatusId_fkey" FOREIGN KEY ("governedStatusId") REFERENCES "Status" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_issuerOrganizationId_fkey" FOREIGN KEY ("issuerOrganizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_deliveryOrganizationId_fkey" FOREIGN KEY ("deliveryOrganizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_projectManagerContactId_fkey" FOREIGN KEY ("projectManagerContactId") REFERENCES "OrganizationContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_sponsorContactId_fkey" FOREIGN KEY ("sponsorContactId") REFERENCES "OrganizationContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("actualEndDate", "actualStartDate", "clientOrganizationId", "createdAt", "defaultLanguage", "deliveryOrganizationId", "description", "descriptionEs", "governedStatusId", "healthStatus", "id", "isActive", "issuerOrganizationId", "name", "nameEs", "plannedEndDate", "plannedStartDate", "projectCode", "projectManagerId", "projectTypeId", "reportLanguageMode", "reportingCadence", "secondaryLanguage", "showClientLogo", "showDeliveryLogo", "showIssuerLogo", "sponsorContactId", "sponsorId", "startDate", "statusId", "updatedAt") SELECT "actualEndDate", "actualStartDate", "clientOrganizationId", "createdAt", "defaultLanguage", "deliveryOrganizationId", "description", "descriptionEs", "governedStatusId", "healthStatus", "id", "isActive", "issuerOrganizationId", "name", "nameEs", "plannedEndDate", "plannedStartDate", "projectCode", "projectManagerId", "projectTypeId", "reportLanguageMode", "reportingCadence", "secondaryLanguage", "showClientLogo", "showDeliveryLogo", "showIssuerLogo", "sponsorContactId", "sponsorId", "startDate", "statusId", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
