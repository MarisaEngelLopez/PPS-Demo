import { prisma } from "@/lib/prisma";

export async function getStatusOptions(scopeCode: string) {
  const scope = await prisma.statusScope.findUnique({
    where: { code: scopeCode },
  });

  if (!scope) return [];

  const defaultScope = await prisma.statusScope.findUnique({
    where: { code: "DEFAULT" },
  });

  const scopeIds =
    defaultScope && scope.inheritDefault
      ? [defaultScope.id, scope.id]
      : [scope.id];

  const usages = await prisma.statusUsage.findMany({
    where: {
      scopeId: { in: scopeIds },
      isActive: true,
      status: { isActive: true },
    },
    include: {
      status: true,
      scope: true,
    },
    orderBy: [
      { scope: { sortOrder: "asc" } },
      { sortOrder: "asc" },
      { status: { sortOrder: "asc" } },
    ],
  });

  const unique = new Map();

  for (const usage of usages) {
    if (!unique.has(usage.status.id)) {
      unique.set(usage.status.id, {
        status: usage.status,
        usage,
      });
    }
  }

  return Array.from(unique.values());
}

export async function getDecisionStatusOptions() {
  return getStatusOptions("DECISION");
}

export async function getProjectStatusOptions() {
  return getStatusOptions("PROJECT");
}

export async function getRiskStatusOptions() {
  return getStatusOptions("RISK");
}

export async function getRiskActionStatusOptions() {
  return getStatusOptions("RISK_ACTION");
}

export async function getAgentInstructionStatusOptions() {
  return getStatusOptions("AGENT_INSTRUCTION");
}

export async function getAgentSuggestionStatusOptions() {
  return getStatusOptions("AGENT_SUGGESTION");
}

export async function getAgentApprovalStatusOptions() {
  return getStatusOptions("AGENT_APPROVAL");
}

export async function getWorkSessionStatusOptions() {
  return getStatusOptions("WORK_SESSION");
}
