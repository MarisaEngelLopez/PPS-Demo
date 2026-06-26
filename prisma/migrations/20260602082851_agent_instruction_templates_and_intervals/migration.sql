-- AlterTable
ALTER TABLE "WorkSession" ADD COLUMN "clientEndedAt" DATETIME;
ALTER TABLE "WorkSession" ADD COLUMN "clientStartedAt" DATETIME;

-- AlterTable
ALTER TABLE "WorkSessionPause" ADD COLUMN "clientPausedAt" DATETIME;
ALTER TABLE "WorkSessionPause" ADD COLUMN "clientResumedAt" DATETIME;

-- CreateTable
CREATE TABLE "AgentInstructionTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'TEXT',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentInstructionTemplate_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkSessionInterval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workSessionId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "clientStartedAt" DATETIME,
    "clientEndedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkSessionInterval_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "WorkSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AgentInstructionTemplate_agentId_idx" ON "AgentInstructionTemplate"("agentId");

-- CreateIndex
CREATE INDEX "AgentInstructionTemplate_sourceType_idx" ON "AgentInstructionTemplate"("sourceType");

-- CreateIndex
CREATE INDEX "AgentInstructionTemplate_isDefault_idx" ON "AgentInstructionTemplate"("isDefault");

-- CreateIndex
CREATE INDEX "AgentInstructionTemplate_isEnabled_idx" ON "AgentInstructionTemplate"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "AgentInstructionTemplate_agentId_templateKey_key" ON "AgentInstructionTemplate"("agentId", "templateKey");

-- CreateIndex
CREATE INDEX "WorkSessionInterval_workSessionId_idx" ON "WorkSessionInterval"("workSessionId");

-- CreateIndex
CREATE INDEX "WorkSessionInterval_startedAt_idx" ON "WorkSessionInterval"("startedAt");

-- CreateIndex
CREATE INDEX "WorkSessionInterval_endedAt_idx" ON "WorkSessionInterval"("endedAt");
