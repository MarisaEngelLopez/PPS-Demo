import { prisma } from "@/lib/prisma";

export async function getProjectTypeAdminRows() {
  const projectTypes = await prisma.projectType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return Promise.all(
    projectTypes.map(async (projectType) => ({
      ...projectType,
      projectCount: await prisma.project.count({
        where: { projectTypeId: projectType.id },
      }),
    }))
  );
}
