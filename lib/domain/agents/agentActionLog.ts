import type { Prisma } from "@prisma/client";
import { formatAgentDisplayTimestamp } from "./agentLogTime";

export type AgentActionLogFilter = {
  from?: Date | null;
  to?: Date | null;
  agentKey?: string | null;
  actionType?: string | null;
  projectId?: string | null;
};

type AgentActionLogWithRelations = Prisma.AgentActionLogGetPayload<{
  include: typeof agentActionLogInclude;
}>;

export const agentActionLogInclude = {
  actorUser: true,
  instruction: {
    include: {
      project: true,
      projectWorkstream: {
        include: {
          workstream: {
            include: {
              phase: true,
            },
          },
        },
      },
      projectTask: true,
    },
  },
  suggestion: true,
  approval: true,
  workSession: {
    include: {
      project: true,
      projectWorkstream: {
        include: {
          workstream: {
            include: {
              phase: true,
            },
          },
        },
      },
      projectTask: true,
    },
  },
} satisfies Prisma.AgentActionLogInclude;

export function parseAgentLogDateParam(value: string | null, endOfDay = false) {
  if (!value) return null;

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getAgentActionLogWhere(filter: AgentActionLogFilter) {
  const where: Prisma.AgentActionLogWhereInput = {};

  if (filter.from || filter.to) {
    where.createdAt = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    };
  }

  if (filter.agentKey) where.agentKey = filter.agentKey;
  if (filter.actionType) where.actionType = filter.actionType;

  if (filter.projectId) {
    where.OR = [
      { instruction: { projectId: filter.projectId } },
      { workSession: { projectId: filter.projectId } },
    ];
  }

  return where;
}

export function formatAgentLogTimestamp(value: Date) {
  return formatAgentDisplayTimestamp(value);
}

function formatWorkstream(
  value:
    | {
        workstream: { name: string; phase?: { name: string } | null };
      }
    | null
    | undefined
) {
  if (!value) return "-";

  const phaseName = value.workstream.phase?.name;
  return `${phaseName ? `${phaseName} / ` : ""}${value.workstream.name}`;
}

function compactJson(value: string | null) {
  if (!value) return "";

  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value;
  }
}

export function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function getAgentActionLogRows(logs: AgentActionLogWithRelations[]) {
  return logs.map((log) => {
    const project = log.workSession?.project ?? log.instruction?.project ?? null;
    const projectWorkstream =
      log.workSession?.projectWorkstream ??
      log.instruction?.projectWorkstream ??
      null;
    const projectTask = log.workSession?.projectTask ?? log.instruction?.projectTask;

    return {
      id: log.id,
      createdAt: log.createdAt,
      timestamp: formatAgentLogTimestamp(log.createdAt),
      agentKey: log.agentKey,
      actionType: log.actionType,
      actor: log.actorUser?.fullName ?? "-",
      project: project ? `${project.projectCode} - ${project.name}` : "-",
      workstream: formatWorkstream(projectWorkstream),
      task: projectTask?.name ?? "-",
      instruction: log.instruction?.rawInstruction ?? "-",
      suggestion: log.suggestion?.title ?? "-",
      approvalId: log.approvalId ?? "",
      workSessionId: log.workSessionId ?? "",
      message: log.message ?? "",
      before: compactJson(log.beforeJson),
      after: compactJson(log.afterJson),
      metadata: compactJson(log.metadataJson),
    };
  });
}
