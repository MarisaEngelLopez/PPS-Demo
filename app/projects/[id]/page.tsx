import {
  pageStyle,
  h1Style,
  buttonStyle,
} from "@/components/ui/layoutStyles";
import { notFound } from "next/navigation";
import { ProjectHeaderForm } from "@/components/projects/ProjectHeaderForm";
import { ProjectWorkstreamsTable } from "@/components/projects/ProjectWorkstreamsTable";
import { ProjectEventsTable } from "@/components/projects/ProjectEventsTable";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import { ExecutiveReportingWorkspace } from "@/components/reporting-packs/ExecutiveReportingWorkspace";
import {
  createFirstReportingPack,
  createReportingPackFromLatest,
  updateReportingPack,
  copyPreviousReportingPackNarrative,
  submitReportingPackNarrativeForReview,
  reviewNarrativeProposal,
  updateNarrativeProposal,
  generateReportingPackNarrativeProposals,
  archiveReportingPack,
  deleteDraftReportingPack,
} from "@/app/reporting-packs/actions";
import {
  createProjectEvent,
  createProjectTask,
  createProjectWorkstream,
  createSubtask,
  deleteProjectEvent,
  deleteProjectTask,
  deleteProjectWorkstream,
  toggleProjectEvent,
  toggleProjectWorkstream,
  updateProject,
  updateProjectEvent,
  updateProjectTask,
  updateProjectWorkstream,
} from "@/app/projects/actions";
import { getProjectDetailPageData } from "@/lib/domain/projects/projectQueries";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import { toManagedNarrativeSummary } from "@/lib/domain/narrative/narrativeRepository";
import { getExecutiveReportProject } from "@/lib/domain/reporting/executiveReportQueries";
import ExecutiveReportDashboard from "@/components/executive-report/ExecutiveReportDashboard";
import { ProjectWorkspaceView } from "@/components/projects/ProjectWorkspaceView";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

const {
  projectStatusOptions,
  organizations,
  project,
  projectWorkstreams,
  availableWorkstreams,
  projectEvents,
  eventTypes,
} = await getProjectDetailPageData(id);

const executiveProject = await getExecutiveReportProject(id);

if (!project) {
  notFound();
}

const selectedReportingPack = executiveProject?.reportingPacks[0] ?? null;

    return (
    <main style={pageStyle}>
      <ProjectWorkspaceView
        briefing={
          executiveProject ? (
            <ExecutiveReportDashboard
              project={executiveProject}
              reportingPack={selectedReportingPack}
              activeChapter="briefing"
              embedded
            />
          ) : null
        }
        management={
          <>

      <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  }}
>
  <h1 style={h1Style}>{project.name}</h1>

  <button
    type="submit"
    form="project-header-form"
    style={buttonStyle}
  >
    {t("actions.saveProjectChanges")}
  </button>
</div>

<ProjectHeaderForm
  project={project}
 projectStatusOptions={projectStatusOptions}
 organizations={organizations}
  updateProject={updateProject}
/>

<div id="workstreams" />
{/*Project Workstreams
*/}

     <ProjectWorkstreamsTable
  projectId={project.id}
  availableWorkstreams={availableWorkstreams}
  projectWorkstreams={projectWorkstreams}
updateProjectWorkstream={updateProjectWorkstream}
  createProjectWorkstream={createProjectWorkstream}
  toggleProjectWorkstream={toggleProjectWorkstream}
  deleteProjectWorkstream={deleteProjectWorkstream}
createProjectTask={createProjectTask}
updateProjectTask={updateProjectTask}
  deleteProjectTask={deleteProjectTask}
createSubtask={createSubtask}
    />

<div id="events" />
{/*Project Milestones
*/}

<ProjectEventsTable
  projectId={project.id}
  events={projectEvents}
  eventTypes={eventTypes}
projectWorkstreams={projectWorkstreams}
  createProjectEvent={createProjectEvent}
  updateProjectEvent={updateProjectEvent}
  toggleProjectEvent={toggleProjectEvent}
  deleteProjectEvent={deleteProjectEvent}
/>

<div style={{ marginTop: "2rem" }}>

 <ProjectTimeline
  projectWorkstreams={projectWorkstreams.filter((pw) => pw.isActive)}
  projectEvents={projectEvents.filter((event) => event.isActive)}
/>
</div>
          </>
        }
        narrativeManagement={
          <ExecutiveReportingWorkspace
            project={project}
            reportingPacks={project.reportingPacks ?? []}
            managedNarratives={project.managedNarratives.flatMap((narrative) => {
              const summary = toManagedNarrativeSummary(narrative);
              return summary ? [summary] : [];
            })}
            createFirstReportingPack={createFirstReportingPack}
            createReportingPackFromLatest={createReportingPackFromLatest}
            updateReportingPack={updateReportingPack}
            copyPreviousReportingPackNarrative={copyPreviousReportingPackNarrative}
            submitReportingPackNarrativeForReview={submitReportingPackNarrativeForReview}
            reviewNarrativeProposal={reviewNarrativeProposal}
            updateNarrativeProposal={updateNarrativeProposal}
            generateReportingPackNarrativeProposals={generateReportingPackNarrativeProposals}
            archiveReportingPack={archiveReportingPack}
            deleteDraftReportingPack={deleteDraftReportingPack}
          />
        }
      />
    </main>
  );
}
