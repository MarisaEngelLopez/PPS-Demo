import { parseAgentJson } from "@/lib/domain/agents/agentRules";
import { PROJECT_PROGRESS_AGENT_KEY } from "@/lib/domain/agents/projectProgressAgent";
import { prisma } from "@/lib/prisma";

type VisibilityItem = {
  targetEntity: string;
  targetRecordId: string;
  label: string;
  fromVisibility?: string | null;
  toVisibility?: string | null;
};

type ProgressSuggestionPayload = {
  command?: string;
  projectId?: string;
  targetEntity?: string;
  targetRecordId?: string;
  date?: string | null;
  visibility?: string | null;
  items?: VisibilityItem[];
  accomplishments?: {
    sinceDate?: string;
    sourceReportingPackVersion?: string;
    workstreams?: string[];
    events?: string[];
    risks?: string[];
    riskActions?: string[];
    decisions?: string[];
  } | null;
};

function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function formatWorkstreamLabel(projectWorkstream: {
  customName?: string | null;
  reportingName?: string | null;
  workstream: { name: string; phase?: { name: string } | null };
}) {
  const phaseName = projectWorkstream.workstream.phase?.name;
  const name =
    projectWorkstream.reportingName ||
    projectWorkstream.customName ||
    projectWorkstream.workstream.name;
  return `${phaseName ? `${phaseName} / ` : ""}${name}`;
}

function formatEventLabel(event: {
  customName?: string | null;
  reportingName?: string | null;
  name: string;
}) {
  return event.reportingName || event.customName || event.name;
}

export async function getProjectProgressAssistantPageData() {
  const [projects, projectWorkstreams, projectEvents, suggestions, voiceSource] =
    await Promise.all([
      prisma.project.findMany({
        where: { isActive: true },
        orderBy: [{ projectCode: "asc" }, { name: "asc" }],
      }),
      prisma.projectWorkstream.findMany({
        where: { isActive: true },
        include: { project: true, workstream: { include: { phase: true } } },
        orderBy: [
          { project: { projectCode: "asc" } },
          { workstream: { phase: { sortOrder: "asc" } } },
          { workstream: { sortOrder: "asc" } },
        ],
      }),
      prisma.projectEvent.findMany({
        where: { isActive: true },
        include: { project: true },
        orderBy: [{ project: { projectCode: "asc" } }, { eventDate: "asc" }],
      }),
      prisma.agentSuggestion.findMany({
        where: {
          agentKey: PROJECT_PROGRESS_AGENT_KEY,
          appliedAt: null,
          status: { code: "OPEN" },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 20,
      }),
      prisma.agentSourceConfig.findFirst({
        where: {
          agent: { agentKey: PROJECT_PROGRESS_AGENT_KEY },
          sourceType: "VOICE",
        },
      }),
    ]);

  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const workstreamMap = new Map(
    projectWorkstreams.map((workstream) => [workstream.id, workstream])
  );
  const eventMap = new Map(projectEvents.map((event) => [event.id, event]));

  return {
    projects,
    projectWorkstreams: projectWorkstreams.map((workstream) => ({
      id: workstream.id,
      projectId: workstream.projectId,
      label: formatWorkstreamLabel(workstream),
      actualStartDate: formatDate(workstream.actualStartDate),
      actualEndDate: formatDate(workstream.actualEndDate),
      visibility: workstream.visibility,
    })),
    projectEvents: projectEvents.map((event) => ({
      id: event.id,
      projectId: event.projectId,
      label: formatEventLabel(event),
      eventDate: formatDate(event.eventDate),
      completionDate: formatDate(event.completionDate),
      isCompleted: event.isCompleted,
      visibility: event.visibility,
    })),
    suggestionRows: suggestions.map((suggestion) => {
      const payload = parseAgentJson<ProgressSuggestionPayload>(
        suggestion.payloadJson,
        {}
      );
      const project = payload.projectId ? projectMap.get(payload.projectId) : null;
      const workstream =
        payload.targetEntity === "PROJECT_WORKSTREAM" && payload.targetRecordId
          ? workstreamMap.get(payload.targetRecordId)
          : null;
      const event =
        payload.targetEntity === "PROJECT_EVENT" && payload.targetRecordId
          ? eventMap.get(payload.targetRecordId)
          : null;

      return {
        id: suggestion.id,
        title: suggestion.title,
        summary: suggestion.summary ?? "",
        command: payload.command ?? "",
        projectId: payload.projectId ?? "",
        targetEntity: payload.targetEntity ?? "",
        targetRecordId: payload.targetRecordId ?? "",
        project: project ? `${project.projectCode} - ${project.name}` : "-",
        target: workstream
          ? formatWorkstreamLabel(workstream)
          : event
            ? formatEventLabel(event)
            : payload.items?.length
              ? `${payload.items.length} item(s)`
              : "-",
        date: payload.date ?? "",
        visibility: payload.visibility ?? "",
        items: payload.items ?? [],
        accomplishments: payload.accomplishments ?? null,
      };
    }),
    defaultProjectId: projects[0]?.id ?? "",
    voiceInputEnabled: Boolean(voiceSource?.isEnabled),
  };
}
