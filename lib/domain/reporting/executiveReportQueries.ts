import { prisma } from "@/lib/prisma";
import {
  executiveReportProjectInclude,
  type ExecutiveReportProject,
  type ExecutiveReportProjectOption,
} from "@/lib/domain/reporting/executiveReportTypes";

export function getExecutiveReportProjectOptions() {
  return prisma.project.findMany({
    where: { isActive: true },
    orderBy: [{ projectCode: "asc" }],
    select: {
      id: true,
      projectCode: true,
      name: true,
    },
  });
}

export function getExecutiveReportProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
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
