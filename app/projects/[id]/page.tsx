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

if (!project) {
  notFound();
}

    return (
    <main style={pageStyle}>

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

<ExecutiveReportingWorkspace
  project={project}
  reportingPacks={project.reportingPacks ?? []}
  createFirstReportingPack={createFirstReportingPack}
  createReportingPackFromLatest={createReportingPackFromLatest}
  updateReportingPack={updateReportingPack}
  archiveReportingPack={archiveReportingPack}
  deleteDraftReportingPack={deleteDraftReportingPack}
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


    </main>
  );
}
