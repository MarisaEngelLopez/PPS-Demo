-- DropIndex
DROP INDEX "ProjectStatus_code_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProjectStatus";
PRAGMA foreign_keys=on;

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
    "governedStatusId" TEXT NOT NULL,
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
    "projectManagerContactId" TEXT,
    "sponsorContactId" TEXT,
    "showIssuerLogo" BOOLEAN NOT NULL DEFAULT true,
    "showClientLogo" BOOLEAN NOT NULL DEFAULT true,
    "showDeliveryLogo" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Project_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES "ProjectType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_governedStatusId_fkey" FOREIGN KEY ("governedStatusId") REFERENCES "Status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_issuerOrganizationId_fkey" FOREIGN KEY ("issuerOrganizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_deliveryOrganizationId_fkey" FOREIGN KEY ("deliveryOrganizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_projectManagerContactId_fkey" FOREIGN KEY ("projectManagerContactId") REFERENCES "OrganizationContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_sponsorContactId_fkey" FOREIGN KEY ("sponsorContactId") REFERENCES "OrganizationContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("actualEndDate", "actualStartDate", "clientOrganizationId", "createdAt", "defaultLanguage", "deliveryOrganizationId", "description", "descriptionEs", "governedStatusId", "healthStatus", "id", "isActive", "issuerOrganizationId", "name", "nameEs", "plannedEndDate", "plannedStartDate", "projectCode", "projectManagerContactId", "projectTypeId", "reportLanguageMode", "reportingCadence", "secondaryLanguage", "showClientLogo", "showDeliveryLogo", "showIssuerLogo", "sponsorContactId", "startDate", "updatedAt") SELECT "actualEndDate", "actualStartDate", "clientOrganizationId", "createdAt", "defaultLanguage", "deliveryOrganizationId", "description", "descriptionEs", "governedStatusId", "healthStatus", "id", "isActive", "issuerOrganizationId", "name", "nameEs", "plannedEndDate", "plannedStartDate", "projectCode", "projectManagerContactId", "projectTypeId", "reportLanguageMode", "reportingCadence", "secondaryLanguage", "showClientLogo", "showDeliveryLogo", "showIssuerLogo", "sponsorContactId", "startDate", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");
CREATE TABLE "new_ProjectTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectWorkstreamId" TEXT NOT NULL,
    "parentTaskId" TEXT,
    "name" TEXT NOT NULL,
    "reportingName" TEXT,
    "description" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'BOTH',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "plannedStartDate" DATETIME,
    "plannedEndDate" DATETIME,
    "actualStartDate" DATETIME,
    "actualEndDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectTask_projectWorkstreamId_fkey" FOREIGN KEY ("projectWorkstreamId") REFERENCES "ProjectWorkstream" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectTask_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "ProjectTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjectTask" ("actualEndDate", "actualStartDate", "createdAt", "description", "id", "isActive", "name", "parentTaskId", "plannedEndDate", "plannedStartDate", "projectWorkstreamId", "reportingName", "sortOrder", "updatedAt", "visibility") SELECT "actualEndDate", "actualStartDate", "createdAt", "description", "id", "isActive", "name", "parentTaskId", "plannedEndDate", "plannedStartDate", "projectWorkstreamId", "reportingName", "sortOrder", "updatedAt", "visibility" FROM "ProjectTask";
DROP TABLE "ProjectTask";
ALTER TABLE "new_ProjectTask" RENAME TO "ProjectTask";
CREATE INDEX "ProjectTask_projectWorkstreamId_idx" ON "ProjectTask"("projectWorkstreamId");
CREATE INDEX "ProjectTask_parentTaskId_idx" ON "ProjectTask"("parentTaskId");
CREATE TABLE "new_ProjectWorkstream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "workstreamId" TEXT NOT NULL,
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
    CONSTRAINT "ProjectWorkstream_governedStatusId_fkey" FOREIGN KEY ("governedStatusId") REFERENCES "Status" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjectWorkstream" ("actualEndDate", "actualQuantity", "actualStartDate", "createdAt", "customName", "deliverable", "endDate", "governedStatusId", "id", "isActive", "measureUnit", "notes", "objective", "plannedEndDate", "plannedQuantity", "plannedStartDate", "projectId", "quantityType", "reportingName", "startDate", "updatedAt", "visibility", "workstreamId") SELECT "actualEndDate", "actualQuantity", "actualStartDate", "createdAt", "customName", "deliverable", "endDate", "governedStatusId", "id", "isActive", "measureUnit", "notes", "objective", "plannedEndDate", "plannedQuantity", "plannedStartDate", "projectId", "quantityType", "reportingName", "startDate", "updatedAt", "visibility", "workstreamId" FROM "ProjectWorkstream";
DROP TABLE "ProjectWorkstream";
ALTER TABLE "new_ProjectWorkstream" RENAME TO "ProjectWorkstream";
CREATE TABLE "new_TemplateWorkstream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "workstreamId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "plannedOffsetDays" INTEGER,
    "durationDays" INTEGER,
    CONSTRAINT "TemplateWorkstream_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TemplateWorkstream_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "Workstream" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TemplateWorkstream" ("durationDays", "id", "plannedOffsetDays", "sortOrder", "templateId", "workstreamId") SELECT "durationDays", "id", "plannedOffsetDays", "sortOrder", "templateId", "workstreamId" FROM "TemplateWorkstream";
DROP TABLE "TemplateWorkstream";
ALTER TABLE "new_TemplateWorkstream" RENAME TO "TemplateWorkstream";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
