import { prisma } from "@/lib/prisma";
import { isStatusScopeCode } from "./statusRules";
import type { StatusReferenceCounts } from "./statusTypes";

export async function countStatusReferences(
  statusId: string
): Promise<StatusReferenceCounts> {
  const [
    statusUsage,
    projects,
    governedProjectWorkstreams,
    decisions,
    risks,
    riskActions,
    agentInstructions,
    agentSuggestions,
    agentApprovals,
    workSessions,
  ] = await Promise.all([
    prisma.statusUsage.count({ where: { statusId } }),
    prisma.project.count({ where: { governedStatusId: statusId } }),
    prisma.projectWorkstream.count({ where: { governedStatusId: statusId } }),
    prisma.projectDecision.count({
      where: { statusId },
    }),
    prisma.projectRisk.count({
      where: { statusId },
    }),
    prisma.projectRiskAction.count({
      where: { statusId },
    }),
    prisma.agentInstruction.count({ where: { statusId } }),
    prisma.agentSuggestion.count({ where: { statusId } }),
    prisma.agentApproval.count({ where: { statusId } }),
    prisma.workSession.count({ where: { statusId } }),
  ]);

  return {
    statusUsage,
    projects,
    projectWorkstreams: governedProjectWorkstreams,
    decisions,
    risks,
    riskActions,
    agentInstructions,
    agentSuggestions,
    agentApprovals,
    workSessions,
  };
}

export async function countStatusUsageRecords(scopeCode: string, statusId: string) {
  if (!isStatusScopeCode(scopeCode)) return 0;

  if (scopeCode === "PROJECT") {
    return prisma.project.count({ where: { governedStatusId: statusId } });
  }

  if (scopeCode === "DECISION") {
    return prisma.projectDecision.count({
      where: { statusId },
    });
  }

  if (scopeCode === "RISK") {
    return prisma.projectRisk.count({
      where: { statusId },
    });
  }

  if (scopeCode === "RISK_ACTION") {
    return prisma.projectRiskAction.count({
      where: { statusId },
    });
  }

  if (scopeCode === "AGENT_INSTRUCTION") {
    return prisma.agentInstruction.count({ where: { statusId } });
  }

  if (scopeCode === "AGENT_SUGGESTION") {
    return prisma.agentSuggestion.count({ where: { statusId } });
  }

  if (scopeCode === "AGENT_APPROVAL") {
    return prisma.agentApproval.count({ where: { statusId } });
  }

  return prisma.workSession.count({ where: { statusId } });
}

export async function getStatusAdminRows() {
  const statuses = await prisma.status.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return Promise.all(
    statuses.map(async (status) => ({
      ...status,
      referenceCounts: await countStatusReferences(status.id),
    }))
  );
}
