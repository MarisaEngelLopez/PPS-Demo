import { prisma } from "@/lib/prisma";
import { getProjectStatusOptions } from "@/lib/status/statusQueries";

export async function getProjectOrganizations() {
  return prisma.organization.findMany({
    where: { isActive: true },
    include: {
      contacts: {
        where: { isActive: true },
        orderBy: [{ isSponsor: "desc" }, { name: "asc" }],
      },
    },
    orderBy: [{ organizationType: "asc" }, { name: "asc" }],
  });
}

export async function getProjectPortfolioPageData() {
  const [
    projects,
    projectTypes,
    projectStatusUsageOptions,
    organizations,
    templates,
  ] = await Promise.all([
    prisma.project.findMany({
      where: { isActive: true },
      include: {
        projectType: true,
        governedStatus: true,
        projectManagerContact: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.projectType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    getProjectStatusOptions(),
    getProjectOrganizations(),
    prisma.projectTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    projects,
    projectTypes,
    projectStatusOptions: projectStatusUsageOptions.map((option) => ({
      id: option.status.id,
      code: option.status.code,
      name: option.status.name,
      nameEs: option.status.nameEs,
    })),
    openProjectStatusIds: projectStatusUsageOptions
      .filter((option) => option.status.code === "OPEN")
      .map((option) => option.status.id),
    organizations,
    templates,
  };
}

export async function getProjectDetailPageData(projectId: string) {
  const [
    projectStatusOptions,
    organizations,
    project,
    projectWorkstreams,
    availableWorkstreams,
    projectEvents,
    eventTypes,
  ] = await Promise.all([
    getProjectStatusOptions(),
    getProjectOrganizations(),
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectType: true,
        governedStatus: true,
        projectManagerContact: true,
        issuerOrganization: true,
        clientOrganization: true,
        deliveryOrganization: true,
        sponsorContact: true,
        reportingPacks: {
          orderBy: [{ version: "desc" }, { createdAt: "desc" }],
        },
        managedNarratives: {
          include: {
            revisions: {
              where: { status: { in: ["PROPOSED", "APPROVED"] } },
              orderBy: { revisionNumber: "desc" },
            },
          },
          orderBy: [{ objectKey: "asc" }, { variant: "asc" }],
        },
      },
    }),
    prisma.projectWorkstream.findMany({
      where: { projectId },
      include: {
        workstream: {
          include: {
            phase: true,
          },
        },
        projectTasks: {
          where: {
            isActive: true,
            parentTaskId: null,
          },
          orderBy: [
            { sortOrder: "asc" },
            { plannedStartDate: "asc" },
            { name: "asc" },
          ],
          include: {
            subtasks: {
              where: { isActive: true },
              orderBy: [
                { sortOrder: "asc" },
                { plannedStartDate: "asc" },
                { name: "asc" },
              ],
            },
          },
        },
      },
      orderBy: [
        { workstream: { phase: { sortOrder: "asc" } } },
        { workstream: { sortOrder: "asc" } },
      ],
    }),
    prisma.workstream.findMany({
      where: { isActive: true },
      include: { phase: true },
      orderBy: [{ phase: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
    prisma.projectEvent.findMany({
      where: { projectId },
      include: {
        eventType: true,
        linkedProjectWorkstream: {
          include: {
            workstream: {
              include: {
                phase: true,
              },
            },
          },
        },
      },
      orderBy: { eventDate: "asc" },
    }),
    prisma.eventType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    projectStatusOptions,
    organizations,
    project,
    projectWorkstreams,
    availableWorkstreams,
    projectEvents,
    eventTypes,
  };
}
