import { prisma } from "@/lib/prisma";
import { NEXT_DRAFT_SOURCE_STATUSES } from "@/lib/domain/reporting/reportingPackRules";
import { getSelectedWorkspace } from "@/lib/workspaceContext";

export const reportingPackOrderBy = [
  { version: "desc" as const },
  { createdAt: "desc" as const },
];

export async function getReportingPacksForAdmin() {
  const selectedWorkspace = await getSelectedWorkspace();

  return prisma.projectReportingPack.findMany({
    where: { project: { workspaceId: selectedWorkspace.id } },
    include: {
      project: {
        select: {
          id: true,
          projectCode: true,
          name: true,
        },
      },
    },
    orderBy: [
      { project: { projectCode: "asc" } },
      { version: "desc" },
      { createdAt: "desc" },
    ],
  });
}

export async function getLatestNextDraftSourcePack(projectId: string) {
  const selectedWorkspace = await getSelectedWorkspace();

  return prisma.projectReportingPack.findFirst({
    where: {
      projectId,
      project: { workspaceId: selectedWorkspace.id },
      isActive: true,
      status: {
        in: NEXT_DRAFT_SOURCE_STATUSES,
      },
    },
    orderBy: reportingPackOrderBy,
  });
}

export async function getLatestReportingPack(projectId: string) {
  const selectedWorkspace = await getSelectedWorkspace();

  return prisma.projectReportingPack.findFirst({
    where: {
      projectId,
      project: { workspaceId: selectedWorkspace.id },
    },
    orderBy: reportingPackOrderBy,
  });
}

export async function getReportingPackStatus(id: string) {
  const selectedWorkspace = await getSelectedWorkspace();

  return prisma.projectReportingPack.findFirst({
    where: { id, project: { workspaceId: selectedWorkspace.id } },
    select: { status: true, projectId: true },
  });
}
