import { prisma } from "@/lib/prisma";
import { getSelectedWorkspace } from "@/lib/workspaceContext";
import {
  executiveReportProjectInclude,
  type ExecutiveReportProject,
  type ExecutiveReportProjectOption,
} from "@/lib/domain/reporting/executiveReportTypes";

export async function getExecutiveReportProjectOptions() {
  const selectedWorkspace = await getSelectedWorkspace();

  return prisma.project.findMany({
    where: { isActive: true, workspaceId: selectedWorkspace.id },
    orderBy: [{ projectCode: "asc" }],
    select: {
      id: true,
      projectCode: true,
      name: true,
    },
  });
}

export async function getExecutiveReportProject(projectId: string) {
  const selectedWorkspace = await getSelectedWorkspace();

  return prisma.project.findFirst({
    where: { id: projectId, workspaceId: selectedWorkspace.id },
    include: executiveReportProjectInclude,
  });
}

export function getExecutiveRiskReviewTypeOptions() {
  return prisma.riskReviewType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
    },
  });
}

export function getSelectedExecutiveProjectId({
  projectId,
  projects,
}: {
  projectId?: string;
  projects: ExecutiveReportProjectOption[];
}) {
  return projectId || projects[0]?.id || "";
}

export function getSelectedReportingPack({
  project,
  reportingPackId,
  selectedProjectId,
}: {
  project: ExecutiveReportProject | null;
  reportingPackId?: string;
  selectedProjectId: string;
}) {
  const reportingPacks = project?.reportingPacks ?? [];

  return (
    reportingPacks.find(
      (pack) =>
        pack.id === reportingPackId && pack.projectId === selectedProjectId
    ) ??
    reportingPacks[0] ??
    null
  );
}
