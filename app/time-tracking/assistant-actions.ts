"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSelectedWorkspace } from "@/lib/workspaceContext";
import {
  calculateWorkSessionDuration,
  claimAgentSuggestionApplication,
  createAgentActionLog,
  createAgentSuggestion,
  createTextAgentInstruction,
} from "@/lib/domain/agents/agentServices";
import {
  agentError,
  agentOk,
  assertAgentEnabled,
  assertCapabilityEnabled,
  datesAreSameUtcDay,
  getCapability,
  getConfigSnapshot,
  getOneUserAgentUser,
  getRuleValue,
  getTimeTrackingAgentConfig,
  parseRuleBoolean,
  parseRuleNumber,
  TIME_TRACKING_AGENT_KEY,
} from "@/lib/domain/agents/timeTrackingAgent";
import {
  getAgentStatusByCodeForScope,
} from "@/lib/domain/agents/agentQueries";
import { parseAgentJson } from "@/lib/domain/agents/agentRules";
import {
  buildStartWorkSessionUnderstanding,
  extractExplicitNotes,
  extractPhaseReference,
  getPositionReferencedCandidate,
  getCandidateConfidence,
  parseTimeTrackingNaturalLanguage,
  rankNaturalLanguageCandidates,
  type TimeTrackingInterpretation,
} from "@/lib/domain/agents/naturalLanguageInterpreter";
import { resolveProjectContext } from "@/lib/domain/agents/projectContextResolver";
import type { AgentJsonValue } from "@/lib/domain/agents/agentTypes";

const TIME_TRACKING_PATH = "/time-tracking";
const TIME_TRACKING_ASSISTANT_PATH = "/time-tracking/assistant";

function revalidateTimeTrackingRoutes() {
  revalidatePath(TIME_TRACKING_PATH);
  revalidatePath(TIME_TRACKING_ASSISTANT_PATH);
  revalidatePath(`${TIME_TRACKING_ASSISTANT_PATH}/logs`);
  revalidatePath("/configuration/agents/transactions");
}

function asString(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function normalizeInstructionSource(value: FormDataEntryValue | null) {
  return asString(value) === "VOICE" ? "VOICE" : "TEXT";
}

function formatProjectWorkstreamLabel(projectWorkstream: {
  workstream: { name: string; phase?: { name: string } | null };
}) {
  const phaseName = projectWorkstream.workstream.phase?.name;
  return `${phaseName ? `${phaseName} / ` : ""}${projectWorkstream.workstream.name}`;
}

function formatProjectTaskLabel(task: { name: string; parentTask?: { name: string } | null }) {
  return task.parentTask ? `${task.parentTask.name} / ${task.name}` : task.name;
}

function getWorkstreamAliases(projectWorkstream: {
  project: { projectCode: string; name: string };
  workstream: { name: string; phase?: { name: string } | null };
}) {
  const name = projectWorkstream.workstream.name;
  const upperName = name.toUpperCase();
  const aliases = [
    name,
    projectWorkstream.workstream.phase?.name ?? "",
    projectWorkstream.project.projectCode,
    projectWorkstream.project.name,
  ];

  if (upperName === "TTT AGENT") {
    aliases.push("text time tracking agent", "typed time tracking agent", "time tracking text agent");
  }
  if (upperName === "TPR AGENT") {
    aliases.push("text project reporting agent", "progress reporting text agent", "project progress text agent");
  }
  if (upperName === "VTT AGENT") {
    aliases.push("voice time tracking agent", "voice tt agent", "time tracking voice agent", "voice time tracking foundation");
  }
  if (upperName === "VPR AGENT") {
    aliases.push("voice project reporting agent", "voice progress reporting agent", "project progress voice agent");
  }
  if (upperName === "NATURAL LANGUAGE") {
    aliases.push("natural language", "natural language foundation", "natural language interpreter", "interpretation foundation");
  }
  if (upperName === "ATEST AGENTS") {
    aliases.push("agent testing", "automatic testing agents");
  }

  return aliases;
}

function isTimeTrackingEligibleWorkstream(projectWorkstream: {
  isActive: boolean;
  governedStatus?: { code: string } | null;
}) {
  return projectWorkstream.isActive && projectWorkstream.governedStatus?.code !== "CLOSED";
}

function phaseNameMatchesReference(phaseName: string | null | undefined, phaseReference: string) {
  const phaseNumber = phaseName?.match(/\b([0-9]+)\b/)?.[1];
  return phaseNumber === phaseReference;
}

function workSessionActionLabel(intent: TimeTrackingInterpretation["intent"]) {
  if (intent === "PAUSE_WORK_SESSION") return "pause";
  if (intent === "RESUME_WORK_SESSION") return "resume";
  if (intent === "FINISH_WORK_SESSION") return "finish";
  if (intent === "UPDATE_WORK_SESSION_NOTES") return "update notes for";
  return "apply";
}

function parseClientTimestamp(value: FormDataEntryValue | null) {
  const text = asString(value);
  if (!text) return null;

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function validateTimeLinks(input: {
  projectId: string;
  projectWorkstreamId: string;
  taskFamilyId: string;
  projectTaskId?: string | null;
}) {
  const selectedWorkspace = await getSelectedWorkspace();
  const [project, projectWorkstream, taskFamily, projectTask] = await Promise.all([
    prisma.project.findFirst({
      where: {
        id: input.projectId,
        isActive: true,
        workspaceId: selectedWorkspace.id,
      },
    }),
    prisma.projectWorkstream.findFirst({
      where: {
        id: input.projectWorkstreamId,
        projectId: input.projectId,
        project: { workspaceId: selectedWorkspace.id },
      },
    }),
    prisma.taskFamily.findFirst({
      where: { id: input.taskFamilyId, isActive: true },
    }),
    input.projectTaskId
      ? prisma.projectTask.findFirst({
          where: {
            id: input.projectTaskId,
            projectWorkstreamId: input.projectWorkstreamId,
            isActive: true,
            projectWorkstream: { project: { workspaceId: selectedWorkspace.id } },
          },
        })
      : Promise.resolve(null),
  ]);

  if (!project) return "Selected project is inactive or missing.";
  if (!projectWorkstream) {
    return "Selected workstream is missing or does not belong to the project.";
  }
  if (!taskFamily) return "Selected task family is inactive or missing.";
  if (input.projectTaskId && !projectTask) {
    return "Selected task does not belong to the selected workstream.";
  }

  return null;
}

async function workSessionInSelectedWorkspace(id: string) {
  const selectedWorkspace = await getSelectedWorkspace();
  return prisma.workSession.findFirst({
    where: {
      id,
      project: { workspaceId: selectedWorkspace.id },
    },
  });
}

async function agentSuggestionInSelectedWorkspace(suggestion: {
  instruction?: { projectId: string | null } | null;
  payloadJson: string | null;
}) {
  const selectedWorkspace = await getSelectedWorkspace();
  const payload = parseAgentJson<AgentJsonValue>(suggestion.payloadJson, {});
  const payloadProjectId =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? String(payload.projectId || "")
      : "";
  const projectId = suggestion.instruction?.projectId ?? payloadProjectId;

  if (!projectId) return false;

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: selectedWorkspace.id },
    select: { id: true },
  });

  return Boolean(project);
}

async function getOpenWorkSessionStatusIds() {
  const [inProgress, onHold] = await Promise.all([
    getAgentStatusByCodeForScope(prisma, "WORK_SESSION", "IN_PROGRESS"),
    getAgentStatusByCodeForScope(prisma, "WORK_SESSION", "ON_HOLD"),
  ]);

  return [inProgress?.id, onHold?.id].filter(Boolean) as string[];
}

async function buildCurrentSessionOptions(rawInstruction: string) {
  const user = await getOneUserAgentUser();
  if (!user) return null;
  const selectedWorkspace = await getSelectedWorkspace();

  const [inProgress, onHold] = await Promise.all([
    getAgentStatusByCodeForScope(prisma, "WORK_SESSION", "IN_PROGRESS"),
    getAgentStatusByCodeForScope(prisma, "WORK_SESSION", "ON_HOLD"),
  ]);

  const statusIds = [inProgress?.id, onHold?.id].filter(Boolean) as string[];
  if (statusIds.length === 0) return null;

  const sessions = await prisma.workSession.findMany({
    where: {
      userId: user.id,
      statusId: { in: statusIds },
      convertedTimeEntryId: null,
      project: { workspaceId: selectedWorkspace.id },
    },
    include: {
      status: true,
      project: true,
      projectWorkstream: {
        include: { workstream: { include: { phase: true } } },
      },
    },
    orderBy: { startedAt: "desc" },
    take: 2,
  });

  if (sessions.length !== 1) return null;

  const session = sessions[0];
  const isPaused = session.statusId === onHold?.id;
  const projectLabel = `${session.project.projectCode} - ${session.project.name}`;
  const projectWorkstreamLabel = formatProjectWorkstreamLabel(session.projectWorkstream);
  const options = isPaused
    ? "resume or cancel"
    : "pause, finish or cancel";

  return {
    ok: false,
    message: "I could not identify the instruction.",
    interpretation: {
      intent: "UNKNOWN" as const,
      confidence: "LOW" as const,
      rawInstruction,
      understoodText: "",
      projectId: session.projectId,
      projectLabel,
      projectWorkstreamId: session.projectWorkstreamId,
      projectWorkstreamLabel,
      workSessionId: session.id,
      clarification: `There is one ${isPaused ? "paused" : "active"} work session for ${projectLabel} / ${projectWorkstreamLabel}. Available options: ${options}.`,
    },
  };
}

export async function interpretTimeTrackingInstruction(formData: FormData): Promise<{
  ok: boolean;
  message: string;
  interpretation?: TimeTrackingInterpretation;
}> {
  const rawInstruction = asString(formData.get("rawInstruction"));
  const selectedProjectId = asString(formData.get("projectId"));
  if (!rawInstruction) {
    return agentError("Write an instruction first.");
  }

  const parsedInstruction = parseTimeTrackingNaturalLanguage(rawInstruction);
  const intent = parsedInstruction.intent;
  if (intent !== "START_WORK_SESSION") {
    if (
      intent === "PAUSE_WORK_SESSION" ||
      intent === "RESUME_WORK_SESSION" ||
      intent === "FINISH_WORK_SESSION" ||
      intent === "UPDATE_WORK_SESSION_NOTES"
    ) {
      const config = await getTimeTrackingAgentConfig();
      const enabledError = assertAgentEnabled(config);
      if (enabledError) return enabledError;
      const capabilityError = assertCapabilityEnabled(config, intent);
      if (capabilityError) return capabilityError;

      const user = await getOneUserAgentUser();
      if (!user) return agentError("No user exists for the Time Tracking Assistant.");

      const openStatusIds = await getOpenWorkSessionStatusIds();
      const statusCode =
        intent === "RESUME_WORK_SESSION"
          ? "ON_HOLD"
          : intent === "PAUSE_WORK_SESSION"
            ? "IN_PROGRESS"
            : null;
      const status = statusCode
        ? await getAgentStatusByCodeForScope(prisma, "WORK_SESSION", statusCode)
        : null;
      if (statusCode && !status) return agentError(`Missing work session status: ${statusCode}.`);
      if (!statusCode && openStatusIds.length === 0) {
        return agentError("Missing open work session status setup.");
      }

      const notes = extractExplicitNotes(rawInstruction);
      if (intent === "UPDATE_WORK_SESSION_NOTES" && !notes) {
        return {
          ok: false,
          message: "I found a notes instruction, but no note text.",
          interpretation: {
            intent,
            confidence: "LOW",
            rawInstruction,
            understoodText: "",
            clarification: "Try: update note testing voice response.",
          },
        };
      }

      const sessions = await prisma.workSession.findMany({
        where: {
          userId: user.id,
          statusId: statusCode ? status!.id : { in: openStatusIds },
          convertedTimeEntryId: null,
          ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
        },
        include: {
          project: true,
          projectWorkstream: {
            include: { workstream: { include: { phase: true } } },
          },
          taskFamily: true,
          projectTask: true,
        },
        orderBy: { startedAt: "desc" },
        take: 2,
      });

      if (sessions.length === 0) {
        return {
          ok: false,
          message: status
            ? `No ${status.name.toLowerCase()} work session was found.`
            : "No active or paused work session was found.",
          interpretation: {
            intent,
            confidence: "LOW",
            rawInstruction,
            understoodText: "",
            clarification:
              intent === "RESUME_WORK_SESSION"
                ? "There is no paused session to resume."
                : intent === "PAUSE_WORK_SESSION"
                  ? "There is no active session to pause."
                  : intent === "FINISH_WORK_SESSION"
                    ? "There is no active or paused session to finish."
                    : "There is no active or paused session to update.",
          },
        };
      }

      if (sessions.length > 1) {
        return {
          ok: false,
          message: "More than one applicable work session was found.",
          interpretation: {
            intent,
            confidence: "LOW",
            rawInstruction,
            understoodText: "",
            clarification: "Please use the Work Sessions table action for the correct row.",
          },
        };
      }

      const session = sessions[0];
      const projectLabel = `${session.project.projectCode} - ${session.project.name}`;
      const projectWorkstreamLabel = formatProjectWorkstreamLabel(
        session.projectWorkstream
      );
      const actionLabel = workSessionActionLabel(intent);

      return {
        ok: true,
        message: "Instruction interpreted. Please confirm before applying.",
        interpretation: {
          intent,
          confidence: "HIGH",
          rawInstruction,
          understoodText:
            intent === "UPDATE_WORK_SESSION_NOTES"
              ? `Understood: update notes for the current work session to "${notes}". Apply now?`
              : `Understood: ${actionLabel} the current work session. Apply now?`,
          projectId: session.projectId,
          projectLabel,
          projectWorkstreamId: session.projectWorkstreamId,
          projectWorkstreamLabel,
          taskFamilyId: session.taskFamilyId ?? undefined,
          taskFamilyLabel: session.taskFamily?.name ?? undefined,
          projectTaskId: session.projectTaskId,
          projectTaskLabel: session.projectTask?.name ?? undefined,
          workSessionId: session.id,
          actionLabel,
          notes,
        },
      };
    }

    if (intent === "UNKNOWN") {
      const currentSessionOptions = await buildCurrentSessionOptions(rawInstruction);
      if (currentSessionOptions) return currentSessionOptions;
    }

    return {
      ok: false,
      message:
        intent === "UNKNOWN"
          ? "I could not identify the instruction yet. For this pilot, try a start-work sentence."
          : "This pilot currently interprets start-work instructions. Pause, resume and finish will be added after this start flow is validated.",
      interpretation: {
        intent,
        confidence: "LOW",
        rawInstruction,
        understoodText: "",
        clarification: "Please say or select the project first, then the workstream.",
      },
    };
  }

  const selectedWorkspace = await getSelectedWorkspace();
  const [projects, projectWorkstreams, taskFamilies, projectTasks] = await Promise.all([
    prisma.project.findMany({
      where: { isActive: true, workspaceId: selectedWorkspace.id },
      orderBy: [{ projectCode: "asc" }, { name: "asc" }],
    }),
    prisma.projectWorkstream.findMany({
      where: { isActive: true, project: { workspaceId: selectedWorkspace.id } },
      include: {
        project: true,
        governedStatus: true,
        workstream: { include: { phase: true } },
      },
      orderBy: [
        { project: { projectCode: "asc" } },
        { workstream: { phase: { sortOrder: "asc" } } },
        { workstream: { sortOrder: "asc" } },
      ],
    }),
    prisma.taskFamily.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.projectTask.findMany({
      where: {
        isActive: true,
        projectWorkstream: { project: { workspaceId: selectedWorkspace.id } },
      },
      include: { parentTask: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const projectContext = resolveProjectContext({
    rawInstruction,
    selectedProjectId,
    projects,
  });
  const effectiveSelectedProjectId = projectContext.projectId;
  if (!effectiveSelectedProjectId) {
    return {
      ok: false,
      message: "I could not identify the project.",
      interpretation: {
        intent,
        confidence: "LOW",
        rawInstruction,
        understoodText: "",
        clarification: "Please say the project name or select a project before using voice input.",
        candidates: {
          projects: projectContext.candidates,
          workstreams: [],
          tasks: [],
        },
      },
    };
  }

  const phaseReference = extractPhaseReference(rawInstruction);
  const projectWorkstreamPool = projectWorkstreams.filter(
    (workstream) => workstream.projectId === effectiveSelectedProjectId
  );
  const phaseFilteredWorkstreamPool = phaseReference
    ? projectWorkstreamPool.filter((workstream) =>
        isTimeTrackingEligibleWorkstream(workstream) &&
        phaseNameMatchesReference(workstream.workstream.phase?.name, phaseReference)
      )
    : projectWorkstreamPool;
  if (phaseReference && phaseFilteredWorkstreamPool.length === 0) {
    return {
      ok: false,
      message: `I found a phase reference (${phaseReference}), but no eligible workstream in that phase.`,
      interpretation: {
        intent,
        confidence: "LOW",
        rawInstruction,
        understoodText: "",
        clarification:
          "Please check that the phase has an active workstream available for time tracking.",
        candidates: {
          projects: projectContext.candidates,
          workstreams: [],
          tasks: [],
        },
      },
    };
  }
  const uniquePhaseWorkstream =
    phaseReference && phaseFilteredWorkstreamPool.length === 1
      ? phaseFilteredWorkstreamPool[0]
      : null;
  const workstreamPool =
    phaseReference && phaseFilteredWorkstreamPool.length > 0
      ? phaseFilteredWorkstreamPool
      : projectWorkstreamPool;
  const workstreamCandidates = rankNaturalLanguageCandidates(
    rawInstruction,
    workstreamPool.map((projectWorkstream) => ({
      id: projectWorkstream.id,
      label: formatProjectWorkstreamLabel(projectWorkstream),
      aliases: getWorkstreamAliases(projectWorkstream),
    }))
  );
  const positionReferencedWorkstream = getPositionReferencedCandidate(
    rawInstruction,
    workstreamPool.map((projectWorkstream) => ({
      id: projectWorkstream.id,
      label: formatProjectWorkstreamLabel(projectWorkstream),
    }))
  );
  const effectiveWorkstreamCandidates =
    uniquePhaseWorkstream && workstreamCandidates.length === 0
      ? [
          {
            id: uniquePhaseWorkstream.id,
            label: formatProjectWorkstreamLabel(uniquePhaseWorkstream),
            score: 10,
          },
        ]
      : workstreamCandidates.length === 0 && positionReferencedWorkstream
        ? [positionReferencedWorkstream]
      : workstreamCandidates;
  const selectedProjectWorkstreamId =
    uniquePhaseWorkstream?.id ??
    (effectiveWorkstreamCandidates[0]?.score >= 4
      ? effectiveWorkstreamCandidates[0].id
      : undefined);
  const projectWorkstream = projectWorkstreams.find(
    (item) => item.id === selectedProjectWorkstreamId
  );
  const project = projects.find(
    (item) => item.id === (effectiveSelectedProjectId ?? projectWorkstream?.projectId)
  );

  const taskPool = selectedProjectWorkstreamId
    ? projectTasks.filter((task) => task.projectWorkstreamId === selectedProjectWorkstreamId)
    : [];
  const taskCandidates = rankNaturalLanguageCandidates(
    rawInstruction,
    taskPool.map((task) => ({
      id: task.id,
      label: formatProjectTaskLabel(task),
      aliases: [task.name, task.parentTask?.name ?? ""],
    }))
  );
  const projectTask =
    taskCandidates[0]?.score >= 4
      ? projectTasks.find((task) => task.id === taskCandidates[0].id)
      : null;

  const taskFamily =
    taskFamilies.find((family) => family.code === "MIS") ??
    taskFamilies.find((family) => family.name.toLowerCase() === "mis") ??
    taskFamilies[0];

  const projectConfidence = getCandidateConfidence(projectContext.candidates);
  const workstreamConfidence = uniquePhaseWorkstream
    ? "HIGH"
    : getCandidateConfidence(effectiveWorkstreamCandidates);
  const effectiveProjectConfidence =
    projectContext.candidates.length > 0
      ? projectConfidence
      : projectWorkstream
        ? "HIGH"
        : "LOW";
  const confidence =
    effectiveProjectConfidence === "HIGH" && workstreamConfidence === "HIGH"
      ? "HIGH"
      : effectiveProjectConfidence === "LOW" || workstreamConfidence === "LOW"
        ? "LOW"
        : "MEDIUM";

  if (!project || !projectWorkstream || !taskFamily) {
    return {
      ok: false,
      message: "I could not resolve the project, workstream and task family.",
      interpretation: {
        intent,
        confidence: "LOW",
        rawInstruction,
        understoodText: "",
        clarification: "Please include a project or workstream name.",
        candidates: {
          projects: projectContext.candidates,
          workstreams: effectiveWorkstreamCandidates,
          tasks: taskCandidates,
        },
      },
    };
  }

  const projectLabel = `${project.projectCode} - ${project.name}`;
  const projectWorkstreamLabel = formatProjectWorkstreamLabel(projectWorkstream);
  const taskFamilyLabel = taskFamily.name;
  const projectTaskLabel = projectTask ? formatProjectTaskLabel(projectTask) : null;
  const explicitNotes = extractExplicitNotes(rawInstruction);

  return {
    ok: confidence !== "LOW",
    message:
      confidence === "LOW"
        ? "I found possible matches, but not enough confidence to start."
        : "Instruction interpreted. Please confirm before starting.",
    interpretation: {
      intent,
      confidence,
      rawInstruction,
      understoodText: buildStartWorkSessionUnderstanding({
        rawInstruction,
        projectLabel,
        projectWorkstreamLabel,
        taskFamilyLabel,
        projectTaskLabel,
      }),
      projectId: project.id,
      projectLabel,
      projectWorkstreamId: projectWorkstream.id,
      projectWorkstreamLabel,
      taskFamilyId: taskFamily.id,
      taskFamilyLabel,
      projectTaskId: projectTask?.id ?? null,
      projectTaskLabel,
      notes: explicitNotes,
      clarification:
        confidence === "MEDIUM"
          ? "Please review the match before confirming."
          : null,
      candidates: {
        projects: projectContext.candidates,
        workstreams: effectiveWorkstreamCandidates,
        tasks: taskCandidates,
      },
    },
  };
}

export async function startWorkSession(formData: FormData) {
  const config = await getTimeTrackingAgentConfig();
  const enabledError = assertAgentEnabled(config);
  if (enabledError) return enabledError;

  const capabilityError = assertCapabilityEnabled(config, "START_WORK_SESSION");
  if (capabilityError) return capabilityError;

  const user = await getOneUserAgentUser();
  if (!user) return agentError("Work session not started: no user exists.");

  const projectId = asString(formData.get("projectId"));
  const projectWorkstreamId = asString(formData.get("projectWorkstreamId"));
  const taskFamilyId = asString(formData.get("taskFamilyId"));
  const projectTaskId = asString(formData.get("projectTaskId")) || null;
  const rawInstruction =
    asString(formData.get("instruction")) || "Start time tracking work session.";
  const sourceType = normalizeInstructionSource(formData.get("sourceType"));
  const interpretationCorrection = asString(formData.get("interpretationCorrection")) || null;
  const notes = asString(formData.get("notes")) || null;
  const clientNow = parseClientTimestamp(formData.get("clientTimestamp"));
  const startedAt = clientNow ?? new Date();

  if (!projectId || !projectWorkstreamId || !taskFamilyId) {
    return agentError("Work session not started: project, workstream and task family are required.");
  }

  if (sourceType === "VOICE") {
    const voiceSource = config?.sources.find((source) => source.sourceType === "VOICE");
    if (!voiceSource?.isEnabled) {
      return agentError("Work session not started: voice input is disabled in Agent Configuration.");
    }
  }

  const linkError = await validateTimeLinks({
    projectId,
    projectWorkstreamId,
    taskFamilyId,
    projectTaskId,
  });
  if (linkError) return agentError(`Work session not started: ${linkError}`);

  const enforceSingleSession = parseRuleBoolean(
    getRuleValue(config, "ONE_ACTIVE_SESSION_PER_USER")
  );
  const openStatusIds = await getOpenWorkSessionStatusIds();

  if (enforceSingleSession && openStatusIds.length > 0) {
    const selectedWorkspace = await getSelectedWorkspace();
    const existingSession = await prisma.workSession.findFirst({
      where: {
        userId: user.id,
        statusId: { in: openStatusIds },
        project: { workspaceId: selectedWorkspace.id },
      },
    });

    if (existingSession) {
      return agentError("Work session not started: an active or paused session already exists.");
    }
  }

  const inProgressStatus = await getAgentStatusByCodeForScope(
    prisma,
    "WORK_SESSION",
    "IN_PROGRESS"
  );
  if (!inProgressStatus) return agentError("Work session not started: missing status setup.");

  const capability = getCapability(config, "START_WORK_SESSION");
  const roundingIncrementMinutes = parseRuleNumber(
    getRuleValue(config, "ROUNDING_INCREMENT_MINUTES"),
    15
  );

  await prisma.$transaction(async (tx) => {
    const instruction = await createTextAgentInstruction(tx, {
      agentKey: TIME_TRACKING_AGENT_KEY,
      userId: user.id,
      projectId,
      projectWorkstreamId,
      projectTaskId,
      rawInstruction,
      sourceType,
      parsedIntent: {
        capabilityKey: "START_WORK_SESSION",
        sourceType,
        interpretationCorrection,
        projectId,
        projectWorkstreamId,
        taskFamilyId,
        projectTaskId,
      },
    });

    const session = await tx.workSession.create({
      data: {
        userId: user.id,
        projectId,
        projectWorkstreamId,
        taskFamilyId,
        projectTaskId,
        statusId: inProgressStatus.id,
        sourceInstructionId: instruction.id,
        startedAt,
        clientStartedAt: clientNow,
        roundingIncrementMinutes,
        notes,
      },
    });

    await tx.workSessionInterval.create({
      data: {
        workSessionId: session.id,
        startedAt,
        clientStartedAt: clientNow,
      },
    });

    await createAgentActionLog(tx, {
      agentKey: TIME_TRACKING_AGENT_KEY,
      actionType: "WORK_SESSION_STARTED",
      actorUserId: user.id,
      instructionId: instruction.id,
      workSessionId: session.id,
      message: "Work session started.",
      after: {
        capabilityId: capability?.id ?? null,
        projectId,
        projectWorkstreamId,
        taskFamilyId,
        projectTaskId,
        startedAt: startedAt.toISOString(),
        clientStartedAt: clientNow?.toISOString() ?? null,
        interpretationCorrection,
      },
    });
  });

  revalidateTimeTrackingRoutes();
  return agentOk("Work session started.");
}

export async function updateWorkSessionNotes(formData: FormData) {
  const config = await getTimeTrackingAgentConfig();
  const enabledError = assertAgentEnabled(config);
  if (enabledError) return enabledError;
  const capabilityError = assertCapabilityEnabled(config, "UPDATE_WORK_SESSION_NOTES");
  if (capabilityError) return capabilityError;

  const id = asString(formData.get("id"));
  const notes = asString(formData.get("notes")) || null;
  if (!id) return agentError("Work session notes not updated: missing session id.");

  const openStatusIds = await getOpenWorkSessionStatusIds();
  const selectedWorkspace = await getSelectedWorkspace();
  const session = await prisma.workSession.findFirst({
    where: {
      id,
      statusId: { in: openStatusIds },
      project: { workspaceId: selectedWorkspace.id },
    },
  });
  if (!session) {
    return agentError("Work session notes not updated: only active or paused sessions can be changed.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.workSession.update({
      where: { id },
      data: { notes },
    });

    await createAgentActionLog(tx, {
      agentKey: TIME_TRACKING_AGENT_KEY,
      actionType: "WORK_SESSION_NOTES_UPDATED",
      actorUserId: session.userId,
      workSessionId: id,
      message: "Work session notes updated.",
      before: { notes: session.notes ?? null },
      after: { notes },
    });
  });

  revalidateTimeTrackingRoutes();
  return agentOk("Work session notes updated.");
}

export async function pauseWorkSession(formData: FormData) {
  const config = await getTimeTrackingAgentConfig();
  const enabledError = assertAgentEnabled(config);
  if (enabledError) return enabledError;
  const capabilityError = assertCapabilityEnabled(config, "PAUSE_WORK_SESSION");
  if (capabilityError) return capabilityError;

  const id = asString(formData.get("id"));
  const clientNow = parseClientTimestamp(formData.get("clientTimestamp"));
  const pausedAt = clientNow ?? new Date();
  if (!id) return agentError("Work session not paused: missing session id.");

  const onHoldStatus = await getAgentStatusByCodeForScope(prisma, "WORK_SESSION", "ON_HOLD");
  if (!onHoldStatus) return agentError("Work session not paused: missing status setup.");

  const selectedWorkspace = await getSelectedWorkspace();
  const session = await prisma.workSession.findFirst({
    where: {
      id,
      project: { workspaceId: selectedWorkspace.id },
    },
    include: { pauses: { where: { resumedAt: null } } },
  });
  if (!session) return agentError("Work session not paused: it no longer exists.");
  if (session.pauses.length > 0) return agentError("Work session is already paused.");

  await prisma.$transaction(async (tx) => {
    await tx.workSessionPause.create({
      data: {
        workSessionId: id,
        pausedAt,
        clientPausedAt: clientNow,
      },
    });
    await tx.workSessionInterval.updateMany({
      where: { workSessionId: id, endedAt: null },
      data: { endedAt: pausedAt, clientEndedAt: clientNow },
    });
    await tx.workSession.update({
      where: { id },
      data: { statusId: onHoldStatus.id },
    });
    await createAgentActionLog(tx, {
      agentKey: TIME_TRACKING_AGENT_KEY,
      actionType: "WORK_SESSION_PAUSED",
      actorUserId: session.userId,
      workSessionId: id,
      message: "Work session paused.",
    });
  });

  revalidateTimeTrackingRoutes();
  return agentOk("Work session paused.");
}

export async function resumeWorkSession(formData: FormData) {
  const config = await getTimeTrackingAgentConfig();
  const enabledError = assertAgentEnabled(config);
  if (enabledError) return enabledError;
  const capabilityError = assertCapabilityEnabled(config, "RESUME_WORK_SESSION");
  if (capabilityError) return capabilityError;

  const id = asString(formData.get("id"));
  const clientNow = parseClientTimestamp(formData.get("clientTimestamp"));
  const resumedAt = clientNow ?? new Date();
  if (!id) return agentError("Work session not resumed: missing session id.");

  const inProgressStatus = await getAgentStatusByCodeForScope(
    prisma,
    "WORK_SESSION",
    "IN_PROGRESS"
  );
  if (!inProgressStatus) return agentError("Work session not resumed: missing status setup.");

  const selectedWorkspace = await getSelectedWorkspace();
  const openPause = await prisma.workSessionPause.findFirst({
    where: {
      workSessionId: id,
      resumedAt: null,
      workSession: { project: { workspaceId: selectedWorkspace.id } },
    },
    include: { workSession: true },
    orderBy: { pausedAt: "desc" },
  });
  if (!openPause) return agentError("Work session not resumed: no open pause exists.");

  await prisma.$transaction(async (tx) => {
    await tx.workSessionPause.update({
      where: { id: openPause.id },
      data: { resumedAt, clientResumedAt: clientNow },
    });
    await tx.workSessionInterval.create({
      data: {
        workSessionId: id,
        startedAt: resumedAt,
        clientStartedAt: clientNow,
      },
    });
    await tx.workSession.update({
      where: { id },
      data: { statusId: inProgressStatus.id },
    });
    await createAgentActionLog(tx, {
      agentKey: TIME_TRACKING_AGENT_KEY,
      actionType: "WORK_SESSION_RESUMED",
      actorUserId: openPause.workSession.userId,
      workSessionId: id,
      message: "Work session resumed.",
    });
  });

  revalidateTimeTrackingRoutes();
  return agentOk("Work session resumed.");
}

export async function finishWorkSession(formData: FormData) {
  const config = await getTimeTrackingAgentConfig();
  const enabledError = assertAgentEnabled(config);
  if (enabledError) return enabledError;
  const capabilityError = assertCapabilityEnabled(config, "FINISH_WORK_SESSION");
  if (capabilityError) return capabilityError;
  const suggestionCapabilityError = assertCapabilityEnabled(
    config,
    "CREATE_TIME_ENTRY_SUGGESTION"
  );
  if (suggestionCapabilityError) return suggestionCapabilityError;

  const id = asString(formData.get("id"));
  const clientNow = parseClientTimestamp(formData.get("clientTimestamp"));
  if (!id) return agentError("Work session not finished: missing session id.");

  const selectedWorkspace = await getSelectedWorkspace();
  const session = await prisma.workSession.findFirst({
    where: {
      id,
      project: { workspaceId: selectedWorkspace.id },
    },
    include: {
      project: true,
      projectWorkstream: { include: { workstream: true } },
      taskFamily: true,
      projectTask: true,
    },
  });
  if (!session) return agentError("Work session not finished: it no longer exists.");
  if (session.convertedSuggestionId || session.convertedTimeEntryId) {
    return agentOk("Work session already finished. No duplicate suggestion created.");
  }

  const now = clientNow ?? new Date();
  const allowCrossDay = parseRuleBoolean(getRuleValue(config, "ALLOW_CROSS_DAY_SESSIONS"));
  if (!allowCrossDay && !datesAreSameUtcDay(session.startedAt, now)) {
    return agentError("Work session not finished: cross-day sessions are disabled.");
  }

  const duration = await calculateWorkSessionDuration(prisma, id, now);
  if (!duration || duration.roundedMinutes <= 0) {
    return agentError("Work session not finished: rounded duration is zero.");
  }

  const closedStatus = await getAgentStatusByCodeForScope(prisma, "WORK_SESSION", "CLOSED");
  if (!closedStatus) return agentError("Work session not finished: missing status setup.");

  const suggestionCapability = getCapability(config, "CREATE_TIME_ENTRY_SUGGESTION");
  const date = now.toISOString().slice(0, 10);
  const roundedHours = duration.roundedHours;

  let suggestionCreated = false;

  await prisma.$transaction(async (tx) => {
    const claimedSession = await tx.workSession.updateMany({
      where: {
        id,
        convertedSuggestionId: null,
        convertedTimeEntryId: null,
      },
      data: {
        statusId: closedStatus.id,
        endedAt: now,
        clientEndedAt: clientNow,
        activeSeconds: duration.activeSeconds,
        roundedMinutes: duration.roundedMinutes,
      },
    });
    if (claimedSession.count !== 1) return;

    await tx.workSessionInterval.updateMany({
      where: { workSessionId: id, endedAt: null },
      data: { endedAt: now, clientEndedAt: clientNow },
    });

    const instruction = session.sourceInstructionId
      ? await tx.agentInstruction.findUnique({
          where: { id: session.sourceInstructionId },
        })
      : null;

    const fallbackInstruction =
      instruction ??
      (await createTextAgentInstruction(tx, {
        agentKey: TIME_TRACKING_AGENT_KEY,
        userId: session.userId,
        projectId: session.projectId,
        projectWorkstreamId: session.projectWorkstreamId,
        projectTaskId: session.projectTaskId,
        rawInstruction: "Finish work session and prepare time entry suggestion.",
        parsedIntent: {
          capabilityKey: "FINISH_WORK_SESSION",
          workSessionId: id,
        },
      }));

    const suggestion = await createAgentSuggestion(tx, {
      instructionId: fallbackInstruction.id,
      agentKey: TIME_TRACKING_AGENT_KEY,
      capabilityId: suggestionCapability?.id ?? null,
      suggestionType: "CREATE_TIME_ENTRY",
      targetEntity: "TIME_ENTRY",
      title: "Create time entry from work session",
      summary: `${session.project.projectCode} - ${session.project.name}: ${roundedHours}h`,
      payload: {
        workSessionId: id,
        projectId: session.projectId,
        projectWorkstreamId: session.projectWorkstreamId,
        taskFamilyId: session.taskFamilyId,
        projectTaskId: session.projectTaskId,
        date,
        hours: roundedHours,
        notes: session.notes ?? null,
      },
      configSnapshot: getConfigSnapshot(config, "CREATE_TIME_ENTRY_SUGGESTION"),
    });

    await tx.workSession.update({
      where: { id },
      data: { convertedSuggestionId: suggestion.id },
    });
    suggestionCreated = true;

    await createAgentActionLog(tx, {
      agentKey: TIME_TRACKING_AGENT_KEY,
      actionType: "WORK_SESSION_FINISHED",
      actorUserId: session.userId,
      instructionId: fallbackInstruction.id,
      suggestionId: suggestion.id,
      workSessionId: id,
      message: "Work session finished and time-entry suggestion created.",
      after: {
        activeSeconds: duration.activeSeconds,
        roundedMinutes: duration.roundedMinutes,
        roundedHours,
      },
    });
  });

  revalidateTimeTrackingRoutes();
  if (!suggestionCreated) {
    return agentOk("Work session already finished. No duplicate suggestion created.");
  }
  return agentOk("Work session finished. Time-entry suggestion created.");
}

export async function cancelWorkSession(formData: FormData) {
  const config = await getTimeTrackingAgentConfig();
  const enabledError = assertAgentEnabled(config);
  if (enabledError) return enabledError;

  const id = asString(formData.get("id"));
  const clientNow = parseClientTimestamp(formData.get("clientTimestamp"));
  if (!id) return agentError("Work session not cancelled: missing session id.");

  const cancelledStatus = await getAgentStatusByCodeForScope(
    prisma,
    "WORK_SESSION",
    "CANCELLED"
  );
  if (!cancelledStatus) return agentError("Work session not cancelled: missing status setup.");

  const session = await workSessionInSelectedWorkspace(id);
  if (!session) return agentError("Work session not cancelled: it no longer exists.");

  const cancelledAt = clientNow ?? new Date();

  await prisma.$transaction(async (tx) => {
    await tx.workSession.update({
      where: { id },
      data: {
        statusId: cancelledStatus.id,
        endedAt: cancelledAt,
        clientEndedAt: clientNow,
      },
    });
    await tx.workSessionInterval.updateMany({
      where: { workSessionId: id, endedAt: null },
      data: { endedAt: cancelledAt, clientEndedAt: clientNow },
    });
    await createAgentActionLog(tx, {
      agentKey: TIME_TRACKING_AGENT_KEY,
      actionType: "WORK_SESSION_CANCELLED",
      actorUserId: session.userId,
      workSessionId: id,
      message: "Work session cancelled.",
    });
  });

  revalidateTimeTrackingRoutes();
  return agentOk("Work session cancelled.");
}

export async function approveTimeEntrySuggestion(formData: FormData) {
  const config = await getTimeTrackingAgentConfig();
  const enabledError = assertAgentEnabled(config);
  if (enabledError) return enabledError;

  const id = asString(formData.get("id"));
  const date = asString(formData.get("date"));
  const hours = Number(formData.get("hours") || 0);
  const notes = asString(formData.get("notes")) || null;
  if (!id || !date || hours <= 0) {
    return agentError("Suggestion not approved: date and hours are required.");
  }

  const suggestion = await prisma.agentSuggestion.findUnique({
    where: { id },
    include: {
      instruction: true,
    },
  });
  if (!suggestion) return agentError("Suggestion not approved: it no longer exists.");
  if (suggestion.appliedAt) return agentError("Suggestion already applied.");
  if (!(await agentSuggestionInSelectedWorkspace(suggestion))) {
    return agentError("Suggestion not approved: it does not belong to the selected workspace.");
  }
  const selectedWorkspace = await getSelectedWorkspace();

  const payload = parseAgentJson<AgentJsonValue>(suggestion.payloadJson, {});
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return agentError("Suggestion not approved: invalid payload.");
  }

  const projectId = String(payload.projectId || "");
  const payloadProjectWorkstreamId = String(payload.projectWorkstreamId || "");
  const projectWorkstreamId =
    asString(formData.get("projectWorkstreamId")) || payloadProjectWorkstreamId;
  const taskFamilyId = String(payload.taskFamilyId || "");
  const payloadProjectTaskId = payload.projectTaskId
    ? String(payload.projectTaskId)
    : null;
  const projectTaskId =
    projectWorkstreamId === payloadProjectWorkstreamId ? payloadProjectTaskId : null;
  const workSessionId = payload.workSessionId ? String(payload.workSessionId) : null;

  const linkError = await validateTimeLinks({
    projectId,
    projectWorkstreamId,
    taskFamilyId,
    projectTaskId,
  });
  if (linkError) return agentError(`Suggestion not approved: ${linkError}`);

  const [approvalStatus, suggestionApprovedStatus] = await Promise.all([
    getAgentStatusByCodeForScope(prisma, "AGENT_APPROVAL", "APPROVED"),
    getAgentStatusByCodeForScope(prisma, "AGENT_SUGGESTION", "APPROVED"),
  ]);
  if (!approvalStatus || !suggestionApprovedStatus) {
    return agentError("Suggestion not approved: missing approval status setup.");
  }

  const user = await getOneUserAgentUser();

  let alreadyApplied = false;
  let duplicateWorkSessionConversion = false;

  await prisma.$transaction(async (tx) => {
    const claimedSuggestion = await claimAgentSuggestionApplication(tx, {
      suggestionId: id,
      approvedStatusId: suggestionApprovedStatus.id,
    });
    if (!claimedSuggestion) {
      alreadyApplied = true;
      return;
    }

    const approval = await tx.agentApproval.create({
      data: {
        suggestionId: id,
        approverUserId: user?.id ?? null,
        statusId: approvalStatus.id,
        decisionNotes: "Approved from Time Tracking Assistant.",
        decidedAt: new Date(),
      },
    });

    if (workSessionId) {
      const sourceSession = await tx.workSession.findFirst({
        where: {
          id: workSessionId,
          project: { workspaceId: selectedWorkspace.id },
        },
        select: { convertedTimeEntryId: true },
      });
      if (!sourceSession) {
        duplicateWorkSessionConversion = true;
        throw new Error("DUPLICATE_WORK_SESSION_CONVERSION");
      }
      if (sourceSession?.convertedTimeEntryId) {
        duplicateWorkSessionConversion = true;
        throw new Error("DUPLICATE_WORK_SESSION_CONVERSION");
      }
    }

    const timeEntry = await tx.timeEntry.create({
      data: {
        projectId,
        projectWorkstreamId,
        taskFamilyId,
        projectTaskId,
        date: new Date(date),
        hours,
        notes,
      },
    });

    await tx.agentSuggestion.update({
      where: { id },
      data: {
        targetRecordId: timeEntry.id,
      },
    });

    if (workSessionId) {
      const linkedSession = await tx.workSession.updateMany({
        where: {
          id: workSessionId,
          convertedTimeEntryId: null,
          project: { workspaceId: selectedWorkspace.id },
        },
        data: { convertedTimeEntryId: timeEntry.id },
      });
      if (linkedSession.count !== 1) {
        duplicateWorkSessionConversion = true;
        throw new Error("DUPLICATE_WORK_SESSION_CONVERSION");
      }
    }

    await createAgentActionLog(tx, {
      agentKey: TIME_TRACKING_AGENT_KEY,
      actionType: "SUGGESTION_APPROVED",
      actorUserId: user?.id ?? null,
      instructionId: suggestion.instructionId,
      suggestionId: id,
      approvalId: approval.id,
      workSessionId,
      message: "Time-entry suggestion approved.",
    });

    await createAgentActionLog(tx, {
      agentKey: TIME_TRACKING_AGENT_KEY,
      actionType: "TIME_ENTRY_CREATED",
      actorUserId: user?.id ?? null,
      instructionId: suggestion.instructionId,
      suggestionId: id,
      approvalId: approval.id,
      workSessionId,
      message: "Official time entry created from approved suggestion.",
      after: {
        timeEntryId: timeEntry.id,
        projectWorkstreamId,
        date,
        hours,
        notes,
      },
    });
  }).catch((error) => {
    if (error instanceof Error && error.message === "DUPLICATE_WORK_SESSION_CONVERSION") {
      return;
    }
    throw error;
  });

  revalidateTimeTrackingRoutes();
  if (alreadyApplied) return agentOk("Suggestion already applied. No duplicate time entry created.");
  if (duplicateWorkSessionConversion) {
    return agentOk("Work session already converted. No duplicate time entry created.");
  }
  return agentOk("Suggestion approved. Time entry created.");
}

export async function rejectTimeEntrySuggestion(formData: FormData) {
  const id = asString(formData.get("id"));
  if (!id) return agentError("Suggestion not rejected: missing id.");

  const suggestion = await prisma.agentSuggestion.findUnique({
    where: { id },
    include: { instruction: true },
  });
  if (!suggestion) return agentError("Suggestion not rejected: it no longer exists.");
  if (!(await agentSuggestionInSelectedWorkspace(suggestion))) {
    return agentError("Suggestion not rejected: it does not belong to the selected workspace.");
  }

  const [approvalStatus, suggestionStatus] = await Promise.all([
    getAgentStatusByCodeForScope(prisma, "AGENT_APPROVAL", "REJECTED"),
    getAgentStatusByCodeForScope(prisma, "AGENT_SUGGESTION", "REJECTED"),
  ]);
  if (!approvalStatus || !suggestionStatus) {
    return agentError("Suggestion not rejected: missing status setup.");
  }

  const user = await getOneUserAgentUser();

  await prisma.$transaction(async (tx) => {
    const approval = await tx.agentApproval.create({
      data: {
        suggestionId: id,
        approverUserId: user?.id ?? null,
        statusId: approvalStatus.id,
        decisionNotes: "Rejected from Time Tracking Assistant.",
        decidedAt: new Date(),
      },
    });

    await tx.agentSuggestion.update({
      where: { id },
      data: { statusId: suggestionStatus.id },
    });

    await createAgentActionLog(tx, {
      agentKey: TIME_TRACKING_AGENT_KEY,
      actionType: "SUGGESTION_REJECTED",
      actorUserId: user?.id ?? null,
      instructionId: suggestion.instructionId,
      suggestionId: id,
      approvalId: approval.id,
      message: "Time-entry suggestion rejected.",
    });
  });

  revalidateTimeTrackingRoutes();
  return agentOk("Suggestion rejected.");
}
