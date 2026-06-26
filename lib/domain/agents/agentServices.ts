import type { AgentSourceType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  roundMinutesToIncrement,
  stringifyAgentJson,
} from "./agentRules";
import type {
  AgentActionType,
  AgentJsonValue,
  AgentKey,
  AgentStatusScopeCode,
  AgentSuggestionType,
  AgentTargetEntity,
} from "./agentTypes";
import {
  getAgentStatusByCodeForScope,
  getDefaultAgentStatusForScope,
} from "./agentQueries";

type AgentDbClient = Prisma.TransactionClient | typeof prisma;

async function requireStatus(
  db: AgentDbClient,
  scopeCode: AgentStatusScopeCode,
  statusCode?: string
) {
  const status = statusCode
    ? await getAgentStatusByCodeForScope(db, scopeCode, statusCode)
    : await getDefaultAgentStatusForScope(db, scopeCode);

  if (!status) {
    throw new Error(
      `Missing status setup for ${scopeCode}${statusCode ? `/${statusCode}` : ""}.`
    );
  }

  return status;
}

export async function createAgentActionLog(
  db: AgentDbClient,
  input: {
    agentKey: AgentKey;
    actionType: AgentActionType;
    actorUserId?: string | null;
    instructionId?: string | null;
    suggestionId?: string | null;
    approvalId?: string | null;
    workSessionId?: string | null;
    message?: string | null;
    before?: AgentJsonValue;
    after?: AgentJsonValue;
    metadata?: AgentJsonValue;
  }
) {
  return db.agentActionLog.create({
    data: {
      agentKey: input.agentKey,
      actionType: input.actionType,
      actorUserId: input.actorUserId ?? null,
      instructionId: input.instructionId ?? null,
      suggestionId: input.suggestionId ?? null,
      approvalId: input.approvalId ?? null,
      workSessionId: input.workSessionId ?? null,
      message: input.message ?? null,
      beforeJson: stringifyAgentJson(input.before),
      afterJson: stringifyAgentJson(input.after),
      metadataJson: stringifyAgentJson(input.metadata),
    },
  });
}

export async function createTextAgentInstruction(
  db: AgentDbClient,
  input: {
    agentKey: AgentKey;
    rawInstruction: string;
    userId?: string | null;
    projectId?: string | null;
    projectWorkstreamId?: string | null;
    projectTaskId?: string | null;
    sourceType?: AgentSourceType;
    parsedIntent?: AgentJsonValue;
  }
) {
  const status = await requireStatus(db, "AGENT_INSTRUCTION", "OPEN");

  const instruction = await db.agentInstruction.create({
    data: {
      agentKey: input.agentKey,
      sourceType: input.sourceType ?? "TEXT",
      userId: input.userId ?? null,
      statusId: status.id,
      projectId: input.projectId ?? null,
      projectWorkstreamId: input.projectWorkstreamId ?? null,
      projectTaskId: input.projectTaskId ?? null,
      rawInstruction: input.rawInstruction.trim(),
      parsedIntentJson: stringifyAgentJson(input.parsedIntent),
    },
  });

  await createAgentActionLog(db, {
    agentKey: input.agentKey,
    actionType: "INSTRUCTION_CREATED",
    actorUserId: input.userId,
    instructionId: instruction.id,
    message: `${input.sourceType ?? "TEXT"} agent instruction created.`,
  });

  return instruction;
}

export async function createAgentSuggestion(
  db: AgentDbClient,
  input: {
    instructionId: string;
    agentKey: AgentKey;
    capabilityId?: string | null;
    suggestionType: AgentSuggestionType;
    targetEntity: AgentTargetEntity;
    targetRecordId?: string | null;
    title: string;
    summary?: string | null;
    payload: AgentJsonValue;
    configSnapshot?: AgentJsonValue;
  }
) {
  const status = await requireStatus(db, "AGENT_SUGGESTION", "OPEN");

  const suggestion = await db.agentSuggestion.create({
    data: {
      instructionId: input.instructionId,
      agentKey: input.agentKey,
      capabilityId: input.capabilityId ?? null,
      suggestionType: input.suggestionType,
      targetEntity: input.targetEntity,
      targetRecordId: input.targetRecordId ?? null,
      statusId: status.id,
      title: input.title,
      summary: input.summary ?? null,
      payloadJson: JSON.stringify(input.payload),
      configSnapshotJson: stringifyAgentJson(input.configSnapshot),
    },
  });

  await createAgentActionLog(db, {
    agentKey: input.agentKey,
    actionType: "SUGGESTION_CREATED",
    instructionId: input.instructionId,
    suggestionId: suggestion.id,
    message: "Agent suggestion created.",
    after: input.payload,
  });

  return suggestion;
}

export async function claimAgentSuggestionApplication(
  db: AgentDbClient,
  input: {
    suggestionId: string;
    approvedStatusId: string;
    appliedAt?: Date;
  }
) {
  const result = await db.agentSuggestion.updateMany({
    where: {
      id: input.suggestionId,
      appliedAt: null,
    },
    data: {
      statusId: input.approvedStatusId,
      appliedAt: input.appliedAt ?? new Date(),
    },
  });

  return result.count === 1;
}

export async function calculateWorkSessionDuration(
  db: AgentDbClient,
  workSessionId: string,
  now = new Date()
) {
  const session = await db.workSession.findUnique({
    where: { id: workSessionId },
    include: { pauses: true, intervals: true },
  });

  if (!session) return null;

  if (session.intervals.length > 0) {
    const activeSeconds = session.intervals.reduce((total, interval) => {
      const start = interval.clientStartedAt ?? interval.startedAt;
      const end = interval.clientEndedAt ?? interval.endedAt ?? now;

      return total + Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    }, 0);

    const roundedMinutes = roundMinutesToIncrement(
      activeSeconds,
      session.roundingIncrementMinutes
    );

    return {
      activeSeconds,
      roundedMinutes,
      roundedHours: roundedMinutes / 60,
    };
  }

  const end = session.clientEndedAt ?? session.endedAt ?? now;
  const elapsedSeconds = Math.max(
    0,
    Math.floor((end.getTime() - session.startedAt.getTime()) / 1000)
  );

  const pausedSeconds = session.pauses.reduce((total, pause) => {
    const resumedAt = pause.resumedAt ?? now;
    return (
      total +
      Math.max(0, Math.floor((resumedAt.getTime() - pause.pausedAt.getTime()) / 1000))
    );
  }, 0);

  const activeSeconds = Math.max(0, elapsedSeconds - pausedSeconds);
  const roundedMinutes = roundMinutesToIncrement(
    activeSeconds,
    session.roundingIncrementMinutes
  );

  return {
    activeSeconds,
    roundedMinutes,
    roundedHours: roundedMinutes / 60,
  };
}
