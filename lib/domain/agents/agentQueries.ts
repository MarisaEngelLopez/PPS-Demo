import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AgentStatusScopeCode } from "./agentTypes";

type AgentDbClient = Prisma.TransactionClient | typeof prisma;

export async function getAgentStatusScopeIds(
  db: AgentDbClient,
  scopeCode: AgentStatusScopeCode
) {
  const scope = await db.statusScope.findUnique({
    where: { code: scopeCode },
  });

  if (!scope) return [];

  const defaultScope = await db.statusScope.findUnique({
    where: { code: "DEFAULT" },
  });

  return defaultScope && scope.inheritDefault
    ? [defaultScope.id, scope.id]
    : [scope.id];
}

export async function getAgentStatusByCodeForScope(
  db: AgentDbClient,
  scopeCode: AgentStatusScopeCode,
  statusCode: string
) {
  const scopeIds = await getAgentStatusScopeIds(db, scopeCode);
  if (scopeIds.length === 0) return null;

  const usage = await db.statusUsage.findFirst({
    where: {
      scopeId: { in: scopeIds },
      isActive: true,
      status: {
        code: statusCode,
        isActive: true,
      },
    },
    include: {
      status: true,
      scope: true,
    },
    orderBy: [
      { scope: { sortOrder: "asc" } },
      { sortOrder: "asc" },
    ],
  });

  return usage?.status ?? null;
}

export async function getDefaultAgentStatusForScope(
  db: AgentDbClient,
  scopeCode: AgentStatusScopeCode
) {
  const scopeIds = await getAgentStatusScopeIds(db, scopeCode);
  if (scopeIds.length === 0) return null;

  const usage = await db.statusUsage.findFirst({
    where: {
      scopeId: { in: scopeIds },
      isActive: true,
      isDefault: true,
      status: { isActive: true },
    },
    include: {
      status: true,
      scope: true,
    },
    orderBy: [
      { scope: { sortOrder: "asc" } },
      { sortOrder: "asc" },
    ],
  });

  return usage?.status ?? null;
}
