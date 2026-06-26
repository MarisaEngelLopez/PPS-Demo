import { prisma } from "@/lib/prisma";

export async function getPhaseAdminRows() {
  const phases = await prisma.phase.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return Promise.all(
    phases.map(async (phase) => ({
      ...phase,
      workstreamCount: await prisma.workstream.count({
        where: { phaseId: phase.id },
      }),
    }))
  );
}
