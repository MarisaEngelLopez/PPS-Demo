import { prisma } from "@/lib/prisma";
import { getSelectedWorkspace } from "@/lib/workspaceContext";

export async function getExecutiveIntelligencePageData() {
  const selectedWorkspace = await getSelectedWorkspace();
  const [items, organizations, contacts, users] = await Promise.all([
    prisma.executiveIntelligence.findMany({
      where: { organization: { workspaceId: selectedWorkspace.id } },
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
      where: { isActive: true, workspaceId: selectedWorkspace.id },
      orderBy: [{ organizationType: "asc" }, { name: "asc" }],
    }),
    prisma.organizationContact.findMany({
      where: { isActive: true, organization: { workspaceId: selectedWorkspace.id } },
      include: { organization: true },
      orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.user.findMany({
      orderBy: { fullName: "asc" },
    }),
  ]);

  return { items, organizations, contacts, users };
}
