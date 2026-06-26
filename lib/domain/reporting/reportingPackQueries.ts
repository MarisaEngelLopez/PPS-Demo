import { prisma } from "@/lib/prisma";
import { NEXT_DRAFT_SOURCE_STATUSES } from "@/lib/domain/reporting/reportingPackRules";

export const reportingPackOrderBy = [
  { version: "desc" as const },
  { createdAt: "desc" as const },
];

export function getReportingPacksForAdmin() {
  return prisma.projectReportingPack.findMany({
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

export function getLatestNextDraftSourcePack(projectId: string) {
  return prisma.projectReportingPack.findFirst({
    where: {
      projectId,
      isActive: true,
      status: {
        in: NEXT_DRAFT_SOURCE_STATUSES,
      },
    },
    orderBy: reportingPackOrderBy,
  });
}

export function getLatestReportingPack(projectId: string) {
  return prisma.projectReportingPack.findFirst({
    where: {
      projectId,
    },
    orderBy: reportingPackOrderBy,
  });
}

export function getReportingPackStatus(id: string) {
  return prisma.projectReportingPack.findUnique({
    where: { id },
    select: { status: true, projectId: true },
  });
}
