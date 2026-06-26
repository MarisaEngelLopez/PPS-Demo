import { prisma } from "@/lib/prisma";

export async function getTaskFamilyAdminRows() {
  const taskFamilies = await prisma.taskFamily.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return Promise.all(
    taskFamilies.map(async (taskFamily) => ({
      ...taskFamily,
      timeEntryCount: await prisma.timeEntry.count({
        where: { taskFamilyId: taskFamily.id },
      }),
    }))
  );
}
