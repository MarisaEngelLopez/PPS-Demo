import ExecutiveReportDashboard from "@/components/executive-report/ExecutiveReportDashboard";
import ProjectReportSelector from "@/components/executive-report/ProjectReportSelector";
import {
  getExecutiveReportProject,
  getExecutiveReportProjectOptions,
  getExecutiveRiskReviewTypeOptions,
  getSelectedExecutiveProjectId,
} from "@/lib/domain/reporting/executiveReportQueries";

type PageProps = {
  searchParams?: Promise<{
    projectId?: string;
  }>;
};

export default async function ExecutiveReportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const projects = await getExecutiveReportProjectOptions();
  const riskReviewTypeHints = (await getExecutiveRiskReviewTypeOptions()).map(
    (reviewType) => reviewType.name
  );
  const selectedProjectId = getSelectedExecutiveProjectId({
    projectId: params?.projectId,
    projects,
  });

  const selectedProject = selectedProjectId
    ? await getExecutiveReportProject(selectedProjectId)
    : null;


return (
  <main className="page-shell">
    <section className="section-panel">
  {projects.length > 0 && (
    <ProjectReportSelector
      projects={projects.map((project) => ({
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
      }))}
      selectedProjectId={selectedProject?.id}
    />
  )}
</section>

    {selectedProject ? (
      <ExecutiveReportDashboard
        project={selectedProject}
        riskReviewTypeHints={riskReviewTypeHints}
      />
    ) : (
      <section className="section-panel">
        <p>No active projects found.</p>
      </section>
    )}
  </main>
);
}
