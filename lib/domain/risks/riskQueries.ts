import { prisma } from "@/lib/prisma";
import { getSelectedWorkspace } from "@/lib/workspaceContext";
import {
  getRiskActionStatusOptions,
  getRiskStatusOptions,
} from "@/lib/status/statusQueries";
import type { Prisma, PrismaClient, Status } from "@prisma/client";
import type { RiskFilters, RiskMetrics, StatusOption } from "./riskTypes";

type RiskDbClient = PrismaClient | Prisma.TransactionClient;

export function boolParam(value: string | string[] | undefined) {
  return value === "true";
}

export function parseRiskFilters(params?: {
  projectId?: string;
  statusId?: string;
  ownerId?: string;
  categoryId?: string;
  escalated?: string;
  redOnly?: string;
  openOnly?: string;
}): RiskFilters {
  return {
    projectId: params?.projectId ?? "",
    statusId: params?.statusId ?? "",
    ownerId: params?.ownerId ?? "",
    categoryId: params?.categoryId ?? "",
    escalated: boolParam(params?.escalated),
    redOnly: boolParam(params?.redOnly),
    openOnly: boolParam(params?.openOnly),
  };
}

async function getStatusScopeIds(db: RiskDbClient, scopeCode: string) {
  const [scope, defaultScope] = await Promise.all([
    db.statusScope.findUnique({
      where: { code: scopeCode },
      select: { id: true, inheritDefault: true },
    }),
    db.statusScope.findUnique({
      where: { code: "DEFAULT" },
      select: { id: true },
    }),
  ]);

  if (!scope) return defaultScope ? [defaultScope.id] : [];

  return defaultScope && scope.inheritDefault
    ? [defaultScope.id, scope.id]
    : [scope.id];
}

export async function resolveStatusByCodeForScope(
  db: RiskDbClient,
  scopeCode: "RISK" | "RISK_ACTION",
  statusCode: string
) {
  const scopeIds = await getStatusScopeIds(db, scopeCode);

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

export async function resolveStatusByIdForScope(
  db: RiskDbClient,
  scopeCode: "RISK" | "RISK_ACTION",
  statusId: string
) {
  const scopeIds = await getStatusScopeIds(db, scopeCode);

  return db.status.findFirst({
    where: {
      id: statusId,
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

export async function getDefaultStatusForScope(
  db: RiskDbClient,
  scopeCode: "RISK" | "RISK_ACTION"
) {
  const scopeIds = await getStatusScopeIds(db, scopeCode);

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

export async function resolveStatusForScopeInput(
  db: RiskDbClient,
  scopeCode: "RISK" | "RISK_ACTION",
  statusCode: string
): Promise<Status | null> {
  return (
    (await resolveStatusByCodeForScope(db, scopeCode, statusCode)) ??
    (await getDefaultStatusForScope(db, scopeCode))
  );
}

export async function getRiskPageData(filters: RiskFilters) {
  const selectedWorkspace = await getSelectedWorkspace();
  const [
    projects,
    riskFilterProjects,
    projectWorkstreams,
    riskCategories,
    riskStatusOptions,
    riskActionStatusOptions,
    evidenceTypes,
    riskReviewTypes,
    riskReviewOutcomes,
    projectDecisions,
    users,
  ] = await Promise.all([
    prisma.project.findMany({
      where: { isActive: true, workspaceId: selectedWorkspace.id },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { workspaceId: selectedWorkspace.id },
      orderBy: [{ projectCode: "asc" }, { name: "asc" }],
    }),
    prisma.projectWorkstream.findMany({
      where: { isActive: true, project: { workspaceId: selectedWorkspace.id } },
      include: {
        project: true,
        workstream: { include: { phase: true } },
      },
      orderBy: [
        { project: { name: "asc" } },
        { workstream: { phase: { sortOrder: "asc" } } },
        { workstream: { sortOrder: "asc" } },
      ],
    }),
    prisma.riskCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    getRiskStatusOptions() as Promise<StatusOption[]>,
    getRiskActionStatusOptions() as Promise<StatusOption[]>,
    prisma.evidenceType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.riskReviewType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.riskReviewOutcome.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.projectDecision.findMany({
      where: { isActive: true, project: { workspaceId: selectedWorkspace.id } },
      include: { statusRef: true },
      orderBy: [{ project: { projectCode: "asc" } }, { decisionCode: "asc" }],
    }),
    prisma.user.findMany({ orderBy: { fullName: "asc" } }),
  ]);

  const riskStatuses = riskStatusOptions.map((option) => option.status);
  const riskActionStatuses = riskActionStatusOptions.map(
    (option) => option.status
  );

  const openRiskStatusCodes = riskStatusOptions
    .filter((option) => option.usage.isOpen)
    .map((option) => option.status.code);
  const inProgressRiskStatusCodes = riskStatusOptions
    .filter((option) => option.usage.isInProgress)
    .map((option) => option.status.code);
  const onHoldRiskStatusCodes = riskStatusOptions
    .filter((option) => option.status.code === "ON_HOLD")
    .map((option) => option.status.code);
  const closedRiskStatusCodes = riskStatusOptions
    .filter((option) => option.usage.isClosed)
    .map((option) => option.status.code);
  const openRiskActionStatusCodes = riskActionStatusOptions
    .filter((option) => option.usage.isOpen)
    .map((option) => option.status.code);
  const closedRiskActionStatusCodes = riskActionStatusOptions
    .filter((option) => option.usage.isClosed)
    .map((option) => option.status.code);
  const negativeRiskStatusCodes = riskStatusOptions
    .filter((option) => option.usage.isNegative)
    .map((option) => option.status.code);

  const where: Prisma.ProjectRiskWhereInput = {
    project: { workspaceId: selectedWorkspace.id },
  };

  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.ownerId) where.ownerId = filters.ownerId;
  if (filters.escalated) where.escalated = true;
  if (filters.redOnly) where.exposure = { gte: 15 };
  if (filters.statusId) {
    where.statusId = filters.statusId;
  } else if (filters.openOnly) {
    where.status = { code: { in: openRiskStatusCodes } };
  }

  const risks = await prisma.projectRisk.findMany({
    where,
    include: {
      project: true,
      projectWorkstream: {
        include: {
          workstream: { include: { phase: true } },
        },
      },
      category: true,
      status: true,
      owner: true,
      riskActions: {
        include: {
          statusRef: true,
          evidenceRecords: {
            include: { evidenceType: true },
            orderBy: [{ evidenceDate: "desc" }, { createdAt: "desc" }],
          },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      },
      assessments: {
        include: {
          assessedByUser: true,
        },
        orderBy: [{ assessmentDate: "desc" }, { createdAt: "desc" }],
      },
      reviews: {
        include: {
          reviewType: true,
          reviewOutcome: true,
          reviewedByUser: true,
          residualAssessment: true,
          decisionLinks: {
            include: {
              projectDecision: {
                include: { statusRef: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ reviewDate: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ targetResolutionDate: "asc" }, { createdAt: "desc" }],
  });

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
    23,
    59,
    59
  );

  const reportingRisks = risks.filter(
    (risk) => !negativeRiskStatusCodes.includes(risk.status?.code ?? "")
  );
  const activeRisks = reportingRisks.filter(
    (risk) => !closedRiskStatusCodes.includes(risk.status?.code)
  );

  const riskMetrics: RiskMetrics = {
    total: reportingRisks.length,
    open: reportingRisks.filter((risk) =>
      openRiskStatusCodes.includes(risk.status?.code ?? "")
    ).length,
    inProgress: reportingRisks.filter((risk) =>
      inProgressRiskStatusCodes.includes(risk.status?.code ?? "")
    ).length,
    onHold: reportingRisks.filter((risk) =>
      onHoldRiskStatusCodes.includes(risk.status?.code ?? "")
    ).length,
    closed: reportingRisks.filter((risk) =>
      closedRiskStatusCodes.includes(risk.status?.code)
    ).length,
    red: activeRisks.filter((risk) => risk.exposure >= 15).length,
    escalated: activeRisks.filter((risk) => risk.escalated).length,
    dueThisMonth: activeRisks.filter(
      (risk) =>
        risk.targetResolutionDate &&
        risk.targetResolutionDate >= startOfMonth &&
        risk.targetResolutionDate <= endOfMonth
    ).length,
    overdue: activeRisks.filter(
      (risk) => risk.targetResolutionDate && risk.targetResolutionDate < today
    ).length,
  };

  return {
    projects,
    riskFilterProjects,
    projectWorkstreams,
    riskCategories,
    riskStatuses,
    riskActionStatuses,
    evidenceTypes,
    riskReviewTypes,
    riskReviewOutcomes,
    projectDecisions,
    users,
    risks,
    openRiskStatusCodes,
    closedRiskStatusCodes,
    openRiskActionStatusCodes,
    closedRiskActionStatusCodes,
    riskMetrics,
  };
}
