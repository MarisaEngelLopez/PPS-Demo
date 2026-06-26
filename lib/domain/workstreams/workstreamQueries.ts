import { prisma } from "@/lib/prisma";

export async function getWorkstreamAdminRows() {
  const workstreams = await prisma.workstream.findMany({
    include: { phase: true },
    orderBy: [
      { phase: { sortOrder: "asc" } },
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  });

  return Promise.all(
    workstreams.map(async (workstream) => ({
      ...workstream,
      projectWorkstreamCount: await prisma.projectWorkstream.count({
        where: { workstreamId: workstream.id },
      }),
      templateWorkstreamCount: await prisma.templateWorkstream.count({
        where: { workstreamId: workstream.id },
      }),
    }))
  );
}

export async function getActivePhaseOptions() {
  return prisma.phase.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
