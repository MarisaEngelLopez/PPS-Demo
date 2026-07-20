import { prisma } from "@/lib/prisma";
import { getSelectedWorkspace } from "@/lib/workspaceContext";

export async function getCustomerDnaPageData() {
  const selectedWorkspace = await getSelectedWorkspace();
  const [items, projects, users] = await Promise.all([
    prisma.customerDna.findMany({
      where: { project: { workspaceId: selectedWorkspace.id } },
      include: {
        project: true,
        owner: true,
        createdByUser: true,
      },
      orderBy: [
        { project: { projectCode: "asc" } },
        { priority: "asc" },
        { category: "asc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.project.findMany({
      where: { isActive: true, workspaceId: selectedWorkspace.id },
      orderBy: [{ projectCode: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      orderBy: { fullName: "asc" },
    }),
  ]);

  return { items, projects, users };
}
