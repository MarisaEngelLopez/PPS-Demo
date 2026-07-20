import { prisma } from "@/lib/prisma";
import { OrganizationsTable } from "@/components/organizations/OrganizationsTable";
import {
  pageStyle,
  h1Style,
  sectionPanelStyle,
} from "@/components/ui/layoutStyles";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import { getSelectedWorkspace } from "@/lib/workspaceContext";
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  createOrganizationContact,
  updateOrganizationContact,
  deleteOrganizationContact,
} from "./actions";

export default async function OrganizationsPage() {
  const locale = await getServerLocale();
  const selectedWorkspace = await getSelectedWorkspace();
  const organizations = await prisma.organization.findMany({
    where: { workspaceId: selectedWorkspace.id },
    include: {
      contacts: {
        include: {
          _count: {
            select: {
              managedProjects: true,
              sponsoredProjects: true,
            },
          },
        },
        orderBy: [{ isSponsor: "desc" }, { name: "asc" }],
      },
      _count: {
        select: {
          contacts: true,
          issuerProjects: true,
          clientProjects: true,
          deliveryProjects: true,
        },
      },
    },
    orderBy: [
      { organizationType: "asc" },
      { name: "asc" },
    ],
  });

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "nav.organizations")}</h1>
      <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "-0.5rem" }}>
        Workspace: {selectedWorkspace.code} - {selectedWorkspace.name}
      </p>

      <div style={{ ...sectionPanelStyle, marginBottom: "1rem" }}>
        {translate(locale, "pages.organizationsDescription")}
      </div>

      <OrganizationsTable
        organizations={organizations}
        createOrganization={createOrganization}
        updateOrganization={updateOrganization}
        deleteOrganization={deleteOrganization}
        createOrganizationContact={createOrganizationContact}
        updateOrganizationContact={updateOrganizationContact}
        deleteOrganizationContact={deleteOrganizationContact}
      />
    </main>
  );
}
