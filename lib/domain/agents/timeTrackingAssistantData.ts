import { parseAgentJson } from "@/lib/domain/agents/agentRules";
import { TIME_TRACKING_AGENT_KEY } from "@/lib/domain/agents/timeTrackingAgent";
import { prisma } from "@/lib/prisma";

type SuggestionPayload = {
  projectId?: string;
  projectWorkstreamId?: string;
  taskFamilyId?: string;
  projectTaskId?: string | null;
  date?: string;
  hours?: number;
  notes?: string | null;
};

function formatWorkstreamLabel(projectWorkstream: {
  workstream: { name: string; phase?: { name: string } | null };
}) {
  const phaseName = projectWorkstream.workstream.phase?.name;
  return `${phaseName ? `${phaseName} / ` : ""}${projectWorkstream.workstream.name}`;
}

function getRecentCutoffDate() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

export async function getTimeTrackingBasePageData() {
  const recentCutoff = getRecentCutoffDate();
  const [projects, taskFamilies, projectWorkstreams, timeEntries] =
    await Promise.all([
      prisma.project.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.taskFamily.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.projectWorkstream.findMany({
        include: {
          project: true,
          workstream: {
            include: {
              phase: true,
            },
          },
          governedStatus: true,
          timeEntries: {
            where: {
              date: { gte: recentCutoff },
            },
            select: { id: true },
            take: 1,
          },
          projectTasks: {
            where: {
              isActive: true,
              parentTaskId: null,
            },
            include: {
              subtasks: {
                where: { isActive: true },
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              },
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
        },
        orderBy: [
          { workstream: { phase: { sortOrder: "asc" } } },
          { workstream: { sortOrder: "asc" } },
        ],
      }),
      prisma.timeEntry.findMany({
        include: {
          project: true,
          taskFamily: true,
          projectTask: true,
          projectWorkstream: {
            include: {
              workstream: {
                include: {
                  phase: true,
                },
              },
            },
          },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
    ]);

  const sortedProjectWorkstreams = [...projectWorkstreams].sort((a, b) => {
    const getGroup = (projectWorkstream: (typeof projectWorkstreams)[number]) => {
      if (!projectWorkstream.isActive) return 40;
      if (projectWorkstream.timeEntries.length > 0) return 10;
      if (projectWorkstream.governedStatus?.code === "CLOSED") return 30;
      return 20;
    };

    const groupDelta = getGroup(a) - getGroup(b);
    if (groupDelta !== 0) return groupDelta;

    const projectDelta = a.project.projectCode.localeCompare(b.project.projectCode);
    if (projectDelta !== 0) return projectDelta;

    const phaseDelta = (a.workstream.phase?.sortOrder ?? 0) - (b.workstream.phase?.sortOrder ?? 0);
    if (phaseDelta !== 0) return phaseDelta;

    const workstreamDelta = a.workstream.sortOrder - b.workstream.sortOrder;
    if (workstreamDelta !== 0) return workstreamDelta;

    return formatWorkstreamLabel(a).localeCompare(formatWorkstreamLabel(b));
  });

  const defaultTaskFamily =
    taskFamilies.find((taskFamily) => taskFamily.code === "MIS") ??
    taskFamilies.find((taskFamily) => taskFamily.name === "MIS") ??
    taskFamilies[0];

  const firstProjectWithWorkstreams =
    sortedProjectWorkstreams.find((projectWorkstream) =>
      projects.some((project) => project.id === projectWorkstream.projectId)
    )?.projectId ?? "";

  const latestEntryProjectIsAvailable =
    Boolean(timeEntries[0]?.projectId) &&
    sortedProjectWorkstreams.some(
      (projectWorkstream) =>
        projectWorkstream.projectId === timeEntries[0]?.projectId
    );
  const latestEntryWorkstreamIsAvailable =
    Boolean(timeEntries[0]?.projectWorkstreamId) &&
    sortedProjectWorkstreams.some(
      (projectWorkstream) =>
        projectWorkstream.id === timeEntries[0]?.projectWorkstreamId
    );

  const defaultProjectId = latestEntryProjectIsAvailable
    ? timeEntries[0]?.projectId || ""
    : firstProjectWithWorkstreams || projects[0]?.id || "";
  const defaultProjectWorkstreamId = latestEntryWorkstreamIsAvailable
    ? timeEntries[0]?.projectWorkstreamId || ""
    : sortedProjectWorkstreams.find(
        (projectWorkstream) => projectWorkstream.projectId === defaultProjectId
      )?.id ?? "";

  return {
    projects,
    projectWorkstreams: sortedProjectWorkstreams,
    taskFamilies,
    timeEntries,
    defaultTaskFamilyId: defaultTaskFamily?.id || "",
    defaultProjectId,
    defaultProjectWorkstreamId,
  };
}

export async function getTimeTrackingAssistantPageData() {
  const baseData = await getTimeTrackingBasePageData();
  const { projects, projectWorkstreams, taskFamilies } = baseData;

  const [workSessions, openSuggestions, instructionTemplates, voiceSource] =
    await Promise.all([
      prisma.workSession.findMany({
        where: {
          convertedTimeEntryId: null,
          status: {
            code: { in: ["IN_PROGRESS", "ON_HOLD"] },
          },
        },
        include: {
          status: true,
          project: true,
          projectWorkstream: {
            include: {
              workstream: {
                include: {
                  phase: true,
                },
              },
            },
          },
          taskFamily: true,
          projectTask: true,
          pauses: {
            where: { resumedAt: null },
          },
          intervals: {
            orderBy: [{ startedAt: "asc" }],
          },
        },
        orderBy: [{ startedAt: "desc" }],
        take: 12,
      }),
      prisma.agentSuggestion.findMany({
        where: {
          agentKey: TIME_TRACKING_AGENT_KEY,
          appliedAt: null,
          status: {
            code: "OPEN",
          },
          suggestionType: "CREATE_TIME_ENTRY",
        },
        include: {
          status: true,
        },
        orderBy: [{ createdAt: "desc" }],
        take: 12,
      }),
      prisma.agentInstructionTemplate.findMany({
        where: {
          isEnabled: true,
          agent: { agentKey: TIME_TRACKING_AGENT_KEY },
          sourceType: "TEXT",
        },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      }),
      prisma.agentSourceConfig.findFirst({
        where: {
          agent: { agentKey: TIME_TRACKING_AGENT_KEY },
          sourceType: "VOICE",
        },
      }),
    ]);

  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const workstreamMap = new Map(
    projectWorkstreams.map((projectWorkstream) => [
      projectWorkstream.id,
      projectWorkstream,
    ])
  );
  const taskFamilyMap = new Map(
    taskFamilies.map((taskFamily) => [taskFamily.id, taskFamily])
  );
  const taskMap = new Map(
    projectWorkstreams.flatMap((projectWorkstream) =>
      (projectWorkstream.projectTasks ?? []).flatMap((task) => [
        [task.id, task] as const,
        ...((task.subtasks ?? []).map((subtask) => [subtask.id, subtask] as const)),
      ])
    )
  );

  const workSessionRows = workSessions.map((session) => ({
    id: session.id,
    project: `${session.project.projectCode} - ${session.project.name}`,
    workstream: formatWorkstreamLabel(session.projectWorkstream),
    taskFamily: session.taskFamily?.name ?? "-",
    taskFamilyCode: session.taskFamily?.code ?? null,
    taskFamilyNameEs: session.taskFamily?.nameEs ?? null,
    task: session.projectTask?.name ?? "-",
    status: session.status.name,
    statusNameEs: session.status.nameEs ?? null,
    statusCode: session.status.code,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? "",
    activeSeconds: session.activeSeconds,
    roundedMinutes: session.roundedMinutes,
    notes: session.notes ?? "",
    isPaused: session.pauses.length > 0,
    convertedTimeEntryId: session.convertedTimeEntryId,
    intervals: session.intervals.map((interval) => ({
      id: interval.id,
      startedAt: (interval.clientStartedAt ?? interval.startedAt).toISOString(),
      endedAt: (interval.clientEndedAt ?? interval.endedAt)?.toISOString() ?? "",
    })),
  }));

  const suggestionRows = openSuggestions.map((suggestion) => {
    const payload = parseAgentJson<SuggestionPayload>(suggestion.payloadJson, {});
    const project = payload.projectId ? projectMap.get(payload.projectId) : null;
    const projectWorkstream = payload.projectWorkstreamId
      ? workstreamMap.get(payload.projectWorkstreamId)
      : null;
    const taskFamily = payload.taskFamilyId
      ? taskFamilyMap.get(payload.taskFamilyId)
      : null;
    const task = payload.projectTaskId ? taskMap.get(payload.projectTaskId) : null;

    return {
      id: suggestion.id,
      title: suggestion.title,
      summary: suggestion.summary ?? "",
      projectId: payload.projectId ?? "",
      projectWorkstreamId: payload.projectWorkstreamId ?? "",
      project: project ? `${project.projectCode} - ${project.name}` : "-",
      workstream: projectWorkstream ? formatWorkstreamLabel(projectWorkstream) : "-",
      taskFamily: taskFamily?.name ?? "-",
      taskFamilyCode: taskFamily?.code ?? null,
      taskFamilyNameEs: taskFamily?.nameEs ?? null,
      task: task?.name ?? "-",
      date: payload.date ?? new Date().toISOString().slice(0, 10),
      hours: Number(payload.hours || 0),
      notes: payload.notes ?? "",
      createdAt: suggestion.createdAt.toISOString(),
    };
  });

  return {
    ...baseData,
    workSessionRows,
    suggestionRows,
    instructionTemplateRows: instructionTemplates.map((template) => ({
      id: template.id,
      label: template.label,
      instruction: template.instruction,
      isDefault: template.isDefault,
    })),
    voiceInputEnabled: Boolean(voiceSource?.isEnabled),
  };
}
