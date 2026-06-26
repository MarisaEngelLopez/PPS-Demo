-- CreateTable
CREATE TABLE "AgentDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "oneUserMode" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgentCapability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "capabilityKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetEntity" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "approvalMode" TEXT NOT NULL DEFAULT 'MANUAL_APPROVAL',
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentCapability_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentSourceConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "transcriptReviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentSourceConfig_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "capabilityId" TEXT,
    "ruleKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value" TEXT NOT NULL,
    "valueType" TEXT NOT NULL DEFAULT 'STRING',
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentRule_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentRule_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "AgentCapability" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentConfigurationChangeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "capabilityId" TEXT,
    "actorUserId" TEXT,
    "changeType" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentConfigurationChangeLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentConfigurationChangeLog_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "AgentCapability" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentConfigurationChangeLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instructionId" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "capabilityId" TEXT,
    "suggestionType" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "targetRecordId" TEXT,
    "statusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "payloadJson" TEXT NOT NULL,
    "configSnapshotJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "appliedAt" DATETIME,
    CONSTRAINT "AgentSuggestion_instructionId_fkey" FOREIGN KEY ("instructionId") REFERENCES "AgentInstruction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentSuggestion_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "AgentCapability" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentSuggestion_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AgentSuggestion" ("agentKey", "appliedAt", "createdAt", "id", "instructionId", "payloadJson", "statusId", "suggestionType", "summary", "targetEntity", "targetRecordId", "title", "updatedAt") SELECT "agentKey", "appliedAt", "createdAt", "id", "instructionId", "payloadJson", "statusId", "suggestionType", "summary", "targetEntity", "targetRecordId", "title", "updatedAt" FROM "AgentSuggestion";
DROP TABLE "AgentSuggestion";
ALTER TABLE "new_AgentSuggestion" RENAME TO "AgentSuggestion";
CREATE INDEX "AgentSuggestion_instructionId_idx" ON "AgentSuggestion"("instructionId");
CREATE INDEX "AgentSuggestion_capabilityId_idx" ON "AgentSuggestion"("capabilityId");
CREATE INDEX "AgentSuggestion_agentKey_idx" ON "AgentSuggestion"("agentKey");
CREATE INDEX "AgentSuggestion_suggestionType_idx" ON "AgentSuggestion"("suggestionType");
CREATE INDEX "AgentSuggestion_targetEntity_idx" ON "AgentSuggestion"("targetEntity");
CREATE INDEX "AgentSuggestion_targetRecordId_idx" ON "AgentSuggestion"("targetRecordId");
CREATE INDEX "AgentSuggestion_statusId_idx" ON "AgentSuggestion"("statusId");
CREATE INDEX "AgentSuggestion_createdAt_idx" ON "AgentSuggestion"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AgentDefinition_agentKey_key" ON "AgentDefinition"("agentKey");

-- CreateIndex
CREATE INDEX "AgentDefinition_isEnabled_idx" ON "AgentDefinition"("isEnabled");

-- CreateIndex
CREATE INDEX "AgentDefinition_sortOrder_idx" ON "AgentDefinition"("sortOrder");

-- CreateIndex
CREATE INDEX "AgentCapability_agentId_idx" ON "AgentCapability"("agentId");

-- CreateIndex
CREATE INDEX "AgentCapability_capabilityKey_idx" ON "AgentCapability"("capabilityKey");

-- CreateIndex
CREATE INDEX "AgentCapability_targetEntity_idx" ON "AgentCapability"("targetEntity");

-- CreateIndex
CREATE INDEX "AgentCapability_isEnabled_idx" ON "AgentCapability"("isEnabled");

-- CreateIndex
CREATE INDEX "AgentCapability_approvalMode_idx" ON "AgentCapability"("approvalMode");

-- CreateIndex
CREATE UNIQUE INDEX "AgentCapability_agentId_capabilityKey_key" ON "AgentCapability"("agentId", "capabilityKey");

-- CreateIndex
CREATE INDEX "AgentSourceConfig_agentId_idx" ON "AgentSourceConfig"("agentId");

-- CreateIndex
CREATE INDEX "AgentSourceConfig_sourceType_idx" ON "AgentSourceConfig"("sourceType");

-- CreateIndex
CREATE INDEX "AgentSourceConfig_isEnabled_idx" ON "AgentSourceConfig"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "AgentSourceConfig_agentId_sourceType_key" ON "AgentSourceConfig"("agentId", "sourceType");

-- CreateIndex
CREATE INDEX "AgentRule_agentId_idx" ON "AgentRule"("agentId");

-- CreateIndex
CREATE INDEX "AgentRule_capabilityId_idx" ON "AgentRule"("capabilityId");

-- CreateIndex
CREATE INDEX "AgentRule_ruleKey_idx" ON "AgentRule"("ruleKey");

-- CreateIndex
CREATE INDEX "AgentRule_isEditable_idx" ON "AgentRule"("isEditable");

-- CreateIndex
CREATE UNIQUE INDEX "AgentRule_agentId_capabilityId_ruleKey_key" ON "AgentRule"("agentId", "capabilityId", "ruleKey");

-- CreateIndex
CREATE INDEX "AgentConfigurationChangeLog_agentId_idx" ON "AgentConfigurationChangeLog"("agentId");

-- CreateIndex
CREATE INDEX "AgentConfigurationChangeLog_capabilityId_idx" ON "AgentConfigurationChangeLog"("capabilityId");

-- CreateIndex
CREATE INDEX "AgentConfigurationChangeLog_actorUserId_idx" ON "AgentConfigurationChangeLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AgentConfigurationChangeLog_changeType_idx" ON "AgentConfigurationChangeLog"("changeType");

-- CreateIndex
CREATE INDEX "AgentConfigurationChangeLog_createdAt_idx" ON "AgentConfigurationChangeLog"("createdAt");
