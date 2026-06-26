import { prisma } from "@/lib/prisma";

export async function getProjectTemplateAdminRows() {
  const templates = await prisma.projectTemplate.findMany({
    orderBy: { name: "asc" },
  });

  return Promise.all(
    templates.map(async (template) => ({
      ...template,
      workstreamCount: await prisma.templateWorkstream.count({
        where: { templateId: template.id },
      }),
    }))
  );
}

export async function getProjectTemplateDetail(id: string) {
  return prisma.projectTemplate.findUnique({
    where: { id },
    include: {
      templateWorkstreams: {
        include: {
          workstream: {
            include: {
              phase: true,
            },
          },
        },
        orderBy: [
          { sortOrder: "asc" },
          { workstream: { phase: { sortOrder: "asc" } } },
          { workstream: { sortOrder: "asc" } },
        ],
      },
    },
  });
}

export async function getActiveTemplateWorkstreamOptions() {
  return prisma.workstream.findMany({
    where: { isActive: true },
    include: {
      phase: true,
    },
    orderBy: [
      { phase: { sortOrder: "asc" } },
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  });
}
