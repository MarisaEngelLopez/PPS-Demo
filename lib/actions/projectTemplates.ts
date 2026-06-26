// /lib/actions/projectTemplates.ts

"use server";

import { prisma } from "@/lib/prisma";

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function applyTemplateToProject(projectId: string, templateId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) return;

  const templateWorkstreams = await prisma.templateWorkstream.findMany({
    where: { templateId },
    orderBy: { sortOrder: "asc" },
  });

  for (const tw of templateWorkstreams) {
    const existing = await prisma.projectWorkstream.findFirst({
      where: {
        projectId,
        workstreamId: tw.workstreamId,
      },
    });

    if (existing) continue;

    const plannedStartDate =
      tw.plannedOffsetDays != null
        ? addDays(project.startDate, tw.plannedOffsetDays)
        : null;

    const plannedEndDate =
      plannedStartDate && tw.durationDays != null
        ? addDays(plannedStartDate, tw.durationDays)
        : null;

    await prisma.projectWorkstream.create({
      data: {
        projectId,
        workstreamId: tw.workstreamId,
        plannedStartDate,
        plannedEndDate,
        isActive: true,
      },
    });
  }
}
