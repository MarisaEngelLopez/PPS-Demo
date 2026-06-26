-- CreateTable
CREATE TABLE "AgentInstruction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentKey" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'TEXT',
    "userId" TEXT,
    "statusId" TEXT NOT NULL,
    "projectId" TEXT,
    "projectWorkstreamId" TEXT,
    "projectTaskId" TEXT,
    "rawInstruction" TEXT NOT NULL,
    "transcript" TEXT,
    "normalizedInstruction" TEXT,
    "parsedIntentJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processedAt" DATETIME,
    CONSTRAINT "AgentInstruction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentInstruction_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AgentInstruction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentInstruction_projectWorkstreamId_fkey" FOREIGN KEY ("projectWorkstreamId") REFERENCES "ProjectWorkstream" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentInstruction_projectTaskId_fkey" FOREIGN KEY ("projectTaskId") REFERENCES "ProjectTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instructionId" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "suggestionType" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "targetRecordId" TEXT,
    "statusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "payloadJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "appliedAt" DATETIME,
    CONSTRAINT "AgentSuggestion_instructionId_fkey" FOREIGN KEY ("instructionId") REFERENCES "AgentInstruction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentSuggestion_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "suggestionId" TEXT NOT NULL,
    "approverUserId" TEXT,
    "statusId" TEXT NOT NULL,
    "decisionNotes" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentApproval_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "AgentSuggestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentApproval_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentApproval_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentActionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instructionId" TEXT,
    "suggestionId" TEXT,
    "approvalId" TEXT,
    "workSessionId" TEXT,
    "actorUserId" TEXT,
    "agentKey" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "message" TEXT,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentActionLog_instructionId_fkey" FOREIGN KEY ("instructionId") REFERENCES "AgentInstruction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentActionLog_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "AgentSuggestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentActionLog_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "AgentApproval" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentActionLog_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "WorkSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentActionLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectWorkstreamId" TEXT NOT NULL,
    "taskFamilyId" TEXT,
    "projectTaskId" TEXT,
    "statusId" TEXT NOT NULL,
    "sourceInstructionId" TEXT,
    "convertedSuggestionId" TEXT,
    "convertedTimeEntryId" TEXT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "activeSeconds" INTEGER,
    "roundedMinutes" INTEGER,
    "roundingIncrementMinutes" INTEGER NOT NULL DEFAULT 15,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkSession_projectWorkstreamId_fkey" FOREIGN KEY ("projectWorkstreamId") REFERENCES "ProjectWorkstream" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkSession_taskFamilyId_fkey" FOREIGN KEY ("taskFamilyId") REFERENCES "TaskFamily" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkSession_projectTaskId_fkey" FOREIGN KEY ("projectTaskId") REFERENCES "ProjectTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkSession_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkSession_sourceInstructionId_fkey" FOREIGN KEY ("sourceInstructionId") REFERENCES "AgentInstruction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkSession_convertedSuggestionId_fkey" FOREIGN KEY ("convertedSuggestionId") REFERENCES "AgentSuggestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkSession_convertedTimeEntryId_fkey" FOREIGN KEY ("convertedTimeEntryId") REFERENCES "TimeEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkSessionPause" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workSessionId" TEXT NOT NULL,
    "pausedAt" DATETIME NOT NULL,
    "resumedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkSessionPause_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "WorkSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AgentInstruction_agentKey_idx" ON "AgentInstruction"("agentKey");

-- CreateIndex
CREATE INDEX "AgentInstruction_sourceType_idx" ON "AgentInstruction"("sourceType");

-- CreateIndex
CREATE INDEX "AgentInstruction_userId_idx" ON "AgentInstruction"("userId");

-- CreateIndex
CREATE INDEX "AgentInstruction_statusId_idx" ON "AgentInstruction"("statusId");

-- CreateIndex
CREATE INDEX "AgentInstruction_projectId_idx" ON "AgentInstruction"("projectId");

-- CreateIndex
CREATE INDEX "AgentInstruction_projectWorkstreamId_idx" ON "AgentInstruction"("projectWorkstreamId");

-- CreateIndex
CREATE INDEX "AgentInstruction_projectTaskId_idx" ON "AgentInstruction"("projectTaskId");

-- CreateIndex
CREATE INDEX "AgentInstruction_createdAt_idx" ON "AgentInstruction"("createdAt");

-- CreateIndex
CREATE INDEX "AgentSuggestion_instructionId_idx" ON "AgentSuggestion"("instructionId");

-- CreateIndex
CREATE INDEX "AgentSuggestion_agentKey_idx" ON "AgentSuggestion"("agentKey");

-- CreateIndex
CREATE INDEX "AgentSuggestion_suggestionType_idx" ON "AgentSuggestion"("suggestionType");

-- CreateIndex
CREATE INDEX "AgentSuggestion_targetEntity_idx" ON "AgentSuggestion"("targetEntity");

-- CreateIndex
CREATE INDEX "AgentSuggestion_targetRecordId_idx" ON "AgentSuggestion"("targetRecordId");

-- CreateIndex
CREATE INDEX "AgentSuggestion_statusId_idx" ON "AgentSuggestion"("statusId");

-- CreateIndex
CREATE INDEX "AgentSuggestion_createdAt_idx" ON "AgentSuggestion"("createdAt");

-- CreateIndex
CREATE INDEX "AgentApproval_suggestionId_idx" ON "AgentApproval"("suggestionId");

-- CreateIndex
CREATE INDEX "AgentApproval_approverUserId_idx" ON "AgentApproval"("approverUserId");

-- CreateIndex
CREATE INDEX "AgentApproval_statusId_idx" ON "AgentApproval"("statusId");

-- CreateIndex
CREATE INDEX "AgentApproval_decidedAt_idx" ON "AgentApproval"("decidedAt");

-- CreateIndex
CREATE INDEX "AgentActionLog_instructionId_idx" ON "AgentActionLog"("instructionId");

-- CreateIndex
CREATE INDEX "AgentActionLog_suggestionId_idx" ON "AgentActionLog"("suggestionId");

-- CreateIndex
CREATE INDEX "AgentActionLog_approvalId_idx" ON "AgentActionLog"("approvalId");

-- CreateIndex
CREATE INDEX "AgentActionLog_workSessionId_idx" ON "AgentActionLog"("workSessionId");

-- CreateIndex
CREATE INDEX "AgentActionLog_actorUserId_idx" ON "AgentActionLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AgentActionLog_agentKey_idx" ON "AgentActionLog"("agentKey");

-- CreateIndex
CREATE INDEX "AgentActionLog_actionType_idx" ON "AgentActionLog"("actionType");

-- CreateIndex
CREATE INDEX "AgentActionLog_createdAt_idx" ON "AgentActionLog"("createdAt");

-- CreateIndex
CREATE INDEX "WorkSession_userId_idx" ON "WorkSession"("userId");

-- CreateIndex
CREATE INDEX "WorkSession_projectId_idx" ON "WorkSession"("projectId");

-- CreateIndex
CREATE INDEX "WorkSession_projectWorkstreamId_idx" ON "WorkSession"("projectWorkstreamId");

-- CreateIndex
CREATE INDEX "WorkSession_taskFamilyId_idx" ON "WorkSession"("taskFamilyId");

-- CreateIndex
CREATE INDEX "WorkSession_projectTaskId_idx" ON "WorkSession"("projectTaskId");

-- CreateIndex
CREATE INDEX "WorkSession_statusId_idx" ON "WorkSession"("statusId");

-- CreateIndex
CREATE INDEX "WorkSession_sourceInstructionId_idx" ON "WorkSession"("sourceInstructionId");

-- CreateIndex
CREATE INDEX "WorkSession_convertedSuggestionId_idx" ON "WorkSession"("convertedSuggestionId");

-- CreateIndex
CREATE INDEX "WorkSession_convertedTimeEntryId_idx" ON "WorkSession"("convertedTimeEntryId");

-- CreateIndex
CREATE INDEX "WorkSession_startedAt_idx" ON "WorkSession"("startedAt");

-- CreateIndex
CREATE INDEX "WorkSessionPause_workSessionId_idx" ON "WorkSessionPause"("workSessionId");

-- CreateIndex
CREATE INDEX "WorkSessionPause_pausedAt_idx" ON "WorkSessionPause"("pausedAt");

-- CreateIndex
CREATE INDEX "WorkSessionPause_resumedAt_idx" ON "WorkSessionPause"("resumedAt");
