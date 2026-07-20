-- CreateTable
CREATE TABLE "AuthUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appUserId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuthUser_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkspaceMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" DATETIME,
    "validTo" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceMembership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMembership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMembership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "workspaceId" TEXT,
    "projectId" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT,
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Organization_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Organization" ("code", "country", "createdAt", "displayName", "id", "industry", "isActive", "legalName", "logoUrl", "name", "notes", "organizationType", "updatedAt", "website") SELECT "code", "country", "createdAt", "displayName", "id", "industry", "isActive", "legalName", "logoUrl", "name", "notes", "organizationType", "updatedAt", "website" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");
CREATE INDEX "Organization_workspaceId_idx" ON "Organization"("workspaceId");
CREATE INDEX "Organization_name_idx" ON "Organization"("name");
CREATE INDEX "Organization_organizationType_idx" ON "Organization"("organizationType");
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT,
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
    CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
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
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AuthUser_email_key" ON "AuthUser"("email");

-- CreateIndex
CREATE INDEX "AuthUser_appUserId_idx" ON "AuthUser"("appUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_token_key" ON "AuthSession"("token");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthAccount_userId_idx" ON "AuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_providerId_accountId_key" ON "AuthAccount"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "AuthVerification_identifier_idx" ON "AuthVerification"("identifier");

-- CreateIndex
CREATE INDEX "AuthVerification_expiresAt_idx" ON "AuthVerification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_code_key" ON "Workspace"("code");

-- CreateIndex
CREATE INDEX "Workspace_type_idx" ON "Workspace"("type");

-- CreateIndex
CREATE INDEX "Workspace_isActive_idx" ON "Workspace"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE INDEX "Role_isActive_idx" ON "Role"("isActive");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_workspaceId_idx" ON "WorkspaceMembership"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_roleId_idx" ON "WorkspaceMembership"("roleId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_isActive_idx" ON "WorkspaceMembership"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMembership_userId_workspaceId_key" ON "WorkspaceMembership"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "ProjectMembership_projectId_idx" ON "ProjectMembership"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMembership_roleId_idx" ON "ProjectMembership"("roleId");

-- CreateIndex
CREATE INDEX "ProjectMembership_isActive_idx" ON "ProjectMembership"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMembership_userId_projectId_key" ON "ProjectMembership"("userId", "projectId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_idx" ON "AuditEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditEvent_workspaceId_idx" ON "AuditEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "AuditEvent_projectId_idx" ON "AuditEvent"("projectId");

-- CreateIndex
CREATE INDEX "AuditEvent_action_idx" ON "AuditEvent"("action");

-- CreateIndex
CREATE INDEX "AuditEvent_outcome_idx" ON "AuditEvent"("outcome");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
