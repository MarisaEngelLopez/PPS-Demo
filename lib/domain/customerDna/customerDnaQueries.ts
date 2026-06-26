import { prisma } from "@/lib/prisma";

export async function getCustomerDnaPageData() {
  const [items, projects, users] = await Promise.all([
    prisma.customerDna.findMany({
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
      where: { isActive: true },
      orderBy: [{ projectCode: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      orderBy: { fullName: "asc" },
    }),
  ]);

  return { items, projects, users };
}
