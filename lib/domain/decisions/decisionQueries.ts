import { prisma } from "@/lib/prisma";
import { getDecisionStatusOptions } from "@/lib/status/statusQueries";
import type { Prisma, PrismaClient, Status } from "@prisma/client";
import { getDecisionStatusCode } from "./decisionRules";
import type {
  DecisionFilters,
  DecisionMetrics,
  DecisionStatusOption,
} from "./decisionTypes";

type DecisionDbClient = PrismaClient | Prisma.TransactionClient;

async function getDecisionStatusScopeIds(db: DecisionDbClient) {
  const [decisionScope, defaultScope] = await Promise.all([
    db.statusScope.findUnique({
      where: { code: "DECISION" },
      select: { id: true, inheritDefault: true },
    }),
    db.statusScope.findUnique({
      where: { code: "DEFAULT" },
      select: { id: true },
    }),
  ]);

  if (!decisionScope) {
    return defaultScope ? [defaultScope.id] : [];
  }

  return defaultScope && decisionScope.inheritDefault
    ? [defaultScope.id, decisionScope.id]
    : [decisionScope.id];
}

export function boolParam(value: string | string[] | undefined) {
  return value === "true";
}

export function parseDecisionFilters(params?: {
  projectId?: string;
  status?: string;
  impact?: string;
  owner?: string;
  escalated?: string;
  overdueOnly?: string;
  openOnly?: string;
}): DecisionFilters {
  return {
    projectId: params?.projectId ?? "",
    status: params?.status ?? "",
    impact: params?.impact ?? "",
    owner: params?.owner ?? "",
    escalated: boolParam(params?.escalated),
    overdueOnly: boolParam(params?.overdueOnly),
    openOnly: boolParam(params?.openOnly),
  };
}

export async function resolveDecisionStatusByCode(
  db: DecisionDbClient,
  statusCode: string
) {
  const scopeIds = await getDecisionStatusScopeIds(db);

  return db.status.findFirst({
    where: {
      code: statusCode,
      isActive: true,
      usages: {
        some: {
          scopeId: { in: scopeIds },
          isActive: true,
          scope: { isActive: true },
        },
      },
    },
  });
}

export async function getDefaultDecisionStatus(db: DecisionDbClient) {
  const scopeIds = await getDecisionStatusScopeIds(db);

  const usage = await db.statusUsage.findFirst({
    where: {
      scopeId: { in: scopeIds },
      isActive: true,
      status: { isActive: true },
      scope: { isActive: true },
      OR: [{ isDefault: true }, { isOpen: true }],
    },
    include: { status: true },
    orderBy: [
      { isDefault: "desc" },
      { isOpen: "desc" },
      { sortOrder: "asc" },
      { status: { sortOrder: "asc" } },
    ],
  });

  return usage?.status ?? null;
}

export async function getClosedDecisionStatus(db: DecisionDbClient) {
  const scopeIds = await getDecisionStatusScopeIds(db);

  const usage = await db.statusUsage.findFirst({
    where: {
      scopeId: { in: scopeIds },
      isActive: true,
      isClosed: true,
      status: { isActive: true },
      scope: { isActive: true },
    },
    include: { status: true },
    orderBy: [{ sortOrder: "asc" }, { status: { sortOrder: "asc" } }],
  });

  return usage?.status ?? null;
}

export async function getOpenDecisionStatusCodes(db: DecisionDbClient) {
  const scopeIds = await getDecisionStatusScopeIds(db);

  const usages = await db.statusUsage.findMany({
    where: {
      scopeId: { in: scopeIds },
      isActive: true,
      isOpen: true,
      status: { isActive: true },
      scope: { isActive: true },
    },
    include: { status: true },
    orderBy: [{ sortOrder: "asc" }, { status: { sortOrder: "asc" } }],
  });

  return Array.from(new Set(usages.map((usage) => usage.status.code)));
}

export async function resolveDecisionStatusForInput(
  db: DecisionDbClient,
  statusCode: string
): Promise<Status | null> {
  return (
    (await resolveDecisionStatusByCode(db, statusCode)) ??
    (await getDefaultDecisionStatus(db))
  );
}

export async function getDecisionPageData(filters: DecisionFilters) {
  const [projects, projectWorkstreams, decisionStatusOptions] = await Promise.all([
    prisma.project.findMany({
      where: { isActive: true },
      orderBy: [{ projectCode: "asc" }],
    }),
    prisma.projectWorkstream.findMany({
      where: { isActive: true },
      include: {
        project: true,
        workstream: {
          include: {
            phase: true,
          },
        },
      },
      orderBy: [
        { project: { projectCode: "asc" } },
        { workstream: { phase: { sortOrder: "asc" } } },
        { workstream: { sortOrder: "asc" } },
      ],
    }),
    getDecisionStatusOptions() as Promise<DecisionStatusOption[]>,
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openCodes = decisionStatusOptions
    .filter((option) => option.usage.isOpen)
    .map((option) => option.status.code);
  const inProgressCodes = decisionStatusOptions
    .filter((option) => option.usage.isInProgress)
    .map((option) => option.status.code);
  const attentionCodes = decisionStatusOptions
    .filter((option) => option.usage.isAttention)
    .map((option) => option.status.code);
  const positiveCodes = decisionStatusOptions
    .filter((option) => option.usage.isPositive)
    .map((option) => option.status.code);
  const negativeCodes = decisionStatusOptions
    .filter((option) => option.usage.isNegative)
    .map((option) => option.status.code);
  const onHoldCodes = decisionStatusOptions
    .filter((option) => option.status.code === "ON_HOLD")
    .map((option) => option.status.code);
  const closedCodes = decisionStatusOptions
    .filter((option) => option.usage.isClosed)
    .map((option) => option.status.code);

  const where: Prisma.ProjectDecisionWhereInput = {
    isActive: true,
  };

  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.impact) where.impact = filters.impact;
  if (filters.owner) where.owner = { contains: filters.owner };
  if (filters.escalated) where.escalated = true;

  const andFilters: Prisma.ProjectDecisionWhereInput[] = [];

  if (filters.status) {
    andFilters.push({
      statusRef: { code: filters.status },
    });
  }

  if (filters.openOnly) {
    andFilters.push({
      statusRef: { code: { in: openCodes } },
    });
  }

  if (filters.overdueOnly) {
    andFilters.push({
      dueDate: { lt: today },
      NOT: {
        statusRef: { code: { in: closedCodes } },
      },
    });
  }

  if (andFilters.length > 0) where.AND = andFilters;

  const decisions = await prisma.projectDecision.findMany({
    where,
    include: {
      project: true,
      statusRef: true,
      projectWorkstream: {
        include: {
          workstream: {
            include: {
              phase: true,
            },
          },
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  const reportingDecisions = decisions.filter(
    (decision) => !negativeCodes.includes(getDecisionStatusCode(decision))
  );
  const activeDecisionCodes = Array.from(
    new Set([...openCodes, ...inProgressCodes, ...attentionCodes, ...onHoldCodes])
  );
  const governanceActiveDecisions = reportingDecisions.filter((decision) =>
    activeDecisionCodes.includes(getDecisionStatusCode(decision))
  );

  const metrics: DecisionMetrics = {
    total: reportingDecisions.length,
    open: reportingDecisions.filter(
      (decision) => getDecisionStatusCode(decision) === "OPEN"
    ).length,
    inProgress: governanceActiveDecisions.filter((decision) =>
      inProgressCodes.includes(getDecisionStatusCode(decision))
    ).length,
    onHold: reportingDecisions.filter((decision) =>
      onHoldCodes.includes(getDecisionStatusCode(decision))
    ).length,
    attention: governanceActiveDecisions.filter((decision) =>
      attentionCodes.includes(getDecisionStatusCode(decision))
    ).length,
    approved: reportingDecisions.filter((decision) =>
      positiveCodes.includes(getDecisionStatusCode(decision))
    ).length,
    rejected: decisions.filter((decision) =>
      negativeCodes.includes(getDecisionStatusCode(decision))
    ).length,
    overdue: governanceActiveDecisions.filter((decision) => {
      if (!decision.dueDate) return false;
      const due = new Date(decision.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    }).length,
    escalated: governanceActiveDecisions.filter((decision) => decision.escalated).length,
    critical: governanceActiveDecisions.filter((decision) => decision.impact === "CRITICAL").length,
  };

  return {
    projects,
    projectWorkstreams,
    decisionStatusOptions,
    decisions,
    metrics,
  };
}
