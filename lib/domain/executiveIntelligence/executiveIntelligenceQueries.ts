import { prisma } from "@/lib/prisma";

export async function getExecutiveIntelligencePageData() {
  const [items, organizations, contacts, users] = await Promise.all([
    prisma.executiveIntelligence.findMany({
      include: {
        organization: true,
        contact: { include: { organization: true } },
        createdByUser: true,
      },
      orderBy: [
        { organization: { name: "asc" } },
        { category: "asc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.organization.findMany({
      where: { isActive: true },
      orderBy: [{ organizationType: "asc" }, { name: "asc" }],
    }),
    prisma.organizationContact.findMany({
      where: { isActive: true },
      include: { organization: true },
      orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.user.findMany({
      orderBy: { fullName: "asc" },
    }),
  ]);

  return { items, organizations, contacts, users };
}
