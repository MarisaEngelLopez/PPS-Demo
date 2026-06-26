import { AdminCardGrid, AdminCardLink } from "@/components/ui/AdminCardLink";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { createProject, deleteProject } from "@/app/projects/actions";
import { getProjectPortfolioPageData } from "@/lib/domain/projects/projectQueries";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";

export default async function ProjectsPage() {
 const locale = await getServerLocale();
 const {
  projects,
  projectTypes,
  projectStatusOptions,
  openProjectStatusIds,
  organizations,
  templates,
} = await getProjectPortfolioPageData();


  return (
    <main style={pageStyle}>


      <h1 style={h1Style}>{translate(locale, "nav.projects")}</h1>

      <div style={{ marginBottom: 24 }}>
        <AdminCardGrid>
          <AdminCardLink
            href="/projects/progress-assistant"
            title={translate(locale, "sections.progressAssistant")}
            description={translate(locale, "projects.progressAssistantDescription")}
          />
        </AdminCardGrid>
      </div>

      <ProjectsTable
        projects={projects}
        projectTypes={projectTypes}
        projectStatusOptions={projectStatusOptions}
        openProjectStatusIds={openProjectStatusIds}
        organizations={organizations}
        templates={templates}
        createProject={createProject}
        deleteProject={deleteProject}
      />
    </main>
  );
}
