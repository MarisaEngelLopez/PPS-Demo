"use server";

import type { AgentSourceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  claimAgentSuggestionApplication,
  createAgentActionLog,
  createAgentSuggestion,
  createTextAgentInstruction,
} from "@/lib/domain/agents/agentServices";
import { getAgentStatusByCodeForScope } from "@/lib/domain/agents/agentQueries";
import { parseAgentJson } from "@/lib/domain/agents/agentRules";
import type {
  AgentCapabilityKey,
  AgentJsonValue,
  AgentTargetEntity,
} from "@/lib/domain/agents/agentTypes";
import {
  assertProjectProgressAgentEnabled,
  assertProjectProgressCapabilityEnabled,
  getProjectProgressAgentConfig,
  getProjectProgressCapability,
  getProjectProgressConfigSnapshot,
  progressAgentError,
  progressAgentOk,
  PROJECT_PROGRESS_AGENT_KEY,
} from "@/lib/domain/agents/projectProgressAgent";
import { getOneUserAgentUser } from "@/lib/domain/agents/timeTrackingAgent";
import {
  extractPhaseReference,
  getCandidateConfidence,
  normalizeNaturalLanguage,
  parseProjectProgressNaturalLanguage,
  rankNaturalLanguageCandidates,
} from "@/lib/domain/agents/naturalLanguageInterpreter";
import { normalizeProjectVisibility } from "@/lib/domain/projectExecution/projectExecutionRules";

const PROGRESS_PATH = "/projects/progress-assistant";

type VisibilityItem = {
  targetEntity: AgentTargetEntity;
  targetRecordId: string;
  label: string;
  fromVisibility?: string | null;
  toVisibility?: string | null;
};

type AccomplishmentsPayload = {
  sinceDate?: string;
  sourceReportingPackId?: string;
  sourceReportingPackVersion?: string;
  workstreams?: string[];
  events?: string[];
  risks?: string[];
  riskActions?: string[];
  decisions?: string[];
};

type ProgressPayload = {
  command?: AgentCapabilityKey;
  projectId?: string;
  targetEntity?: AgentTargetEntity;
  targetRecordId?: string;
  date?: string | null;
  visibility?: string | null;
  items?: VisibilityItem[];
  accomplishments?: AccomplishmentsPayload | null;
  sourceType?: AgentSourceType;
  rawInstruction?: string;
  interpretationCorrection?: string | null;
};

function asString(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function dateOrClientToday(value: FormDataEntryValue | null, clientTimestamp: FormDataEntryValue | null) {
  const explicit = asString(value);
  if (explicit) return explicit;
  const client = new Date(asString(clientTimestamp) || Date.now());
  return Number.isNaN(client.getTime())
    ? new Date().toISOString().slice(0, 10)
    : client.toISOString().slice(0, 10);
}

function labelForCommand(command: string) {
  return command
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeProgressInstructionSource(value: FormDataEntryValue | null): AgentSourceType {
  return asString(value) === "VOICE" ? "VOICE" : "TEXT";
}

function assertProgressSourceEnabled(
  config: Awaited<ReturnType<typeof getProjectProgressAgentConfig>>,
  sourceType: AgentSourceType
) {
  const source = config?.sources.find((item) => item.sourceType === sourceType);
  if (!source?.isEnabled) {
    return progressAgentError(
      `${sourceType === "VOICE" ? "Voice" : "Text"} input is disabled for the Project Progress Assistant.`
    );
  }
  return null;
}

function revalidateProgress(projectId?: string | null) {
  revalidatePath(PROGRESS_PATH);
  revalidatePath("/configuration/agents/transactions");
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/executive-report");
}

function projectIdForPayload(payload: ProgressPayload) {
  return payload.projectId || null;
}

async function createProgressSuggestion(input: {
  capabilityKey: AgentCapabilityKey;
  projectId: string;
  targetEntity: AgentTargetEntity;
  targetRecordId?: string | null;
  title: string;
  summary: string;
  payload: ProgressPayload;
  rawInstruction?: string;
  sourceType?: AgentSourceType;
}) {
  const config = await getProjectProgressAgentConfig();
  const enabledError = assertProjectProgressAgentEnabled(config);
  if (enabledError) return enabledError;
  const sourceError = assertProgressSourceEnabled(config, input.sourceType ?? "TEXT");
  if (sourceError) return sourceError;
  const capabilityError = assertProjectProgressCapabilityEnabled(
    config,
    input.capabilityKey
  );
  if (capabilityError) return capabilityError;

  const user = await getOneUserAgentUser();
  const capability = getProjectProgressCapability(config, input.capabilityKey);

  await prisma.$transaction(async (tx) => {
    const instruction = await createTextAgentInstruction(tx, {
      agentKey: PROJECT_PROGRESS_AGENT_KEY,
      userId: user?.id ?? null,
      projectId: input.projectId,
      projectWorkstreamId:
        input.targetEntity === "PROJECT_WORKSTREAM" ? input.targetRecordId : null,
      rawInstruction: input.rawInstruction ?? input.title,
      sourceType: input.sourceType ?? "TEXT",
      parsedIntent: input.payload as AgentJsonValue,
    });

    const suggestion = await createAgentSuggestion(tx, {
      instructionId: instruction.id,
      agentKey: PROJECT_PROGRESS_AGENT_KEY,
      capabilityId: capability?.id ?? null,
      suggestionType:
        input.capabilityKey.includes("VISIBILITY") ||
        input.capabilityKey === "MOVE_COMPLETED_ITEMS_TO_DETAILED"
          ? "UPDATE_VISIBILITY"
          : "UPDATE_PROGRESS",
      targetEntity: input.targetEntity,
      targetRecordId: input.targetRecordId ?? null,
      title: input.title,
      summary: input.summary,
      payload: input.payload as AgentJsonValue,
      configSnapshot: getProjectProgressConfigSnapshot(config, input.capabilityKey),
    });

    await createAgentActionLog(tx, {
      agentKey: PROJECT_PROGRESS_AGENT_KEY,
      actionType: "PROJECT_PROGRESS_SUGGESTION_CREATED",
      actorUserId: user?.id ?? null,
      instructionId: instruction.id,
      suggestionId: suggestion.id,
      message: "Project progress suggestion created.",
      after: input.payload as AgentJsonValue,
    });
  });

  revalidateProgress(input.projectId);
  return progressAgentOk("Project progress suggestion created.");
}

export async function createWorkstreamCommandSuggestion(formData: FormData) {
  const command = asString(formData.get("command")) as AgentCapabilityKey;
  const projectId = asString(formData.get("projectId"));
  const id = asString(formData.get("projectWorkstreamId"));
  const visibility = normalizeProjectVisibility(formData.get("visibility"));
  const date = dateOrClientToday(formData.get("date"), formData.get("clientTimestamp"));
  const sourceType = normalizeProgressInstructionSource(formData.get("sourceType"));
  const rawInstruction = asString(formData.get("rawInstruction"));
  const interpretationCorrection = asString(formData.get("interpretationCorrection"));

  if (!projectId || !id) return progressAgentError("Project and workstream are required.");

  const workstream = await prisma.projectWorkstream.findFirst({
    where: { id, projectId },
    include: { workstream: { include: { phase: true } } },
  });
  if (!workstream) return progressAgentError("Workstream not found in selected project.");

  const name =
    workstream.reportingName || workstream.customName || workstream.workstream.name;
  const phase = workstream.workstream.phase?.name;
  const label = `${phase ? `${phase} / ` : ""}${name}`;
  const payload: ProgressPayload = {
    command,
    projectId,
    targetEntity: "PROJECT_WORKSTREAM",
    targetRecordId: id,
    date: ["START_WORKSTREAM", "FINISH_WORKSTREAM"].includes(command) ? date : null,
    visibility: command === "CHANGE_WORKSTREAM_VISIBILITY" ? visibility : null,
    sourceType,
    rawInstruction: rawInstruction || labelForCommand(command),
    interpretationCorrection: interpretationCorrection || null,
  };

  return createProgressSuggestion({
    capabilityKey: command,
    projectId,
    targetEntity: "PROJECT_WORKSTREAM",
    targetRecordId: id,
    title: labelForCommand(command),
    summary:
      command === "CHANGE_WORKSTREAM_VISIBILITY"
        ? `${label}: ${workstream.visibility} -> ${visibility}`
        : `${label}: ${labelForCommand(command)}${payload.date ? ` on ${payload.date}` : ""}`,
    payload,
    rawInstruction: payload.rawInstruction,
    sourceType,
  });
}

export async function createEventCommandSuggestion(formData: FormData) {
  const command = asString(formData.get("command")) as AgentCapabilityKey;
  const projectId = asString(formData.get("projectId"));
  const id = asString(formData.get("eventId"));
  const visibility = normalizeProjectVisibility(formData.get("visibility"));
  const date = dateOrClientToday(formData.get("date"), formData.get("clientTimestamp"));
  const sourceType = normalizeProgressInstructionSource(formData.get("sourceType"));
  const rawInstruction = asString(formData.get("rawInstruction"));
  const interpretationCorrection = asString(formData.get("interpretationCorrection"));

  if (!projectId || !id) return progressAgentError("Project and milestone are required.");

  const event = await prisma.projectEvent.findFirst({ where: { id, projectId } });
  if (!event) return progressAgentError("Milestone not found in selected project.");

  const label = event.reportingName || event.customName || event.name;
  const payload: ProgressPayload = {
    command,
    projectId,
    targetEntity: "PROJECT_EVENT",
    targetRecordId: id,
    date: command === "COMPLETE_EVENT" ? date : null,
    visibility: command === "CHANGE_EVENT_VISIBILITY" ? visibility : null,
    sourceType,
    rawInstruction: rawInstruction || labelForCommand(command),
    interpretationCorrection: interpretationCorrection || null,
  };

  return createProgressSuggestion({
    capabilityKey: command,
    projectId,
    targetEntity: "PROJECT_EVENT",
    targetRecordId: id,
    title: labelForCommand(command),
    summary:
      command === "CHANGE_EVENT_VISIBILITY"
        ? `${label}: ${event.visibility} -> ${visibility}`
        : `${label}: ${labelForCommand(command)}${payload.date ? ` on ${payload.date}` : ""}`,
    payload,
    rawInstruction: payload.rawInstruction,
    sourceType,
  });
}

function progressCommandDateRequired(command: AgentCapabilityKey | null) {
  return command === "START_WORKSTREAM" || command === "FINISH_WORKSTREAM" || command === "COMPLETE_EVENT";
}

function progressCommandLabel(command: AgentCapabilityKey | null) {
  return command ? labelForCommand(command).toLowerCase() : "project progress command";
}

function phaseNameMatchesReference(phaseName: string | null | undefined, phaseReference: string) {
  const phaseNumber = phaseName?.match(/\b([0-9]+)\b/)?.[1];
  return phaseNumber === phaseReference;
}

function workstreamAliases(workstream: {
  project: { projectCode: string; name: string };
  customName?: string | null;
  reportingName?: string | null;
  workstream: { name: string; phase?: { name: string } | null };
}) {
  const phase = workstream.workstream.phase?.name ?? "";
  const name = workstream.reportingName || workstream.customName || workstream.workstream.name;
  return [
    name,
    workstream.workstream.name,
    workstream.reportingName ?? "",
    workstream.customName ?? "",
    phase,
    phase && name ? `${phase} ${name}` : "",
    ...agentAssistantAliases(name),
    ...agentAssistantAliases(workstream.workstream.name),
    ...(workstream.reportingName ? agentAssistantAliases(workstream.reportingName) : []),
    ...(workstream.customName ? agentAssistantAliases(workstream.customName) : []),
    `${workstream.project.projectCode} ${name}`,
    workstream.project.name,
  ].filter(Boolean);
}

function agentAssistantAliases(value: string) {
  const normalized = normalizeNaturalLanguage(value);
  const aliases: string[] = [];

  if (/\bagent\b/.test(normalized)) {
    aliases.push(value.replace(/\bagent\b/gi, "Assistant"));
  }
  if (/\bassistant\b/.test(normalized)) {
    aliases.push(value.replace(/\bassistant\b/gi, "Agent"));
  }
  if (/\bpr\b/.test(normalized)) {
    aliases.push(
      "PR Assistant",
      "PR Agent",
      "Progress Assistant",
      "Progress Reporting Assistant",
      "Project Reporting Assistant",
      "Project Progress Assistant"
    );
  }
  if (/\btt\b/.test(normalized)) {
    aliases.push(
      "TT Assistant",
      "TT Agent",
      "Time Tracking Assistant",
      "Time Tracking Agent"
    );
  }

  return Array.from(new Set(aliases));
}

function eventAliases(event: {
  project: { projectCode: string; name: string };
  customName?: string | null;
  reportingName?: string | null;
  name: string;
}) {
  const name = event.reportingName || event.customName || event.name;
  return [
    name,
    event.name,
    event.reportingName ?? "",
    event.customName ?? "",
    ...agentAssistantAliases(name),
    ...agentAssistantAliases(event.name),
    ...(event.reportingName ? agentAssistantAliases(event.reportingName) : []),
    ...(event.customName ? agentAssistantAliases(event.customName) : []),
    `${event.project.projectCode} ${name}`,
    event.project.name,
    "milestone",
  ].filter(Boolean);
}

function projectLabel(project: { projectCode: string; name: string }) {
  return `${project.projectCode} - ${project.name}`;
}

function buildProjectProgressUnderstanding(input: {
  command: AgentCapabilityKey;
  projectLabel: string;
  targetLabel: string;
  targetType: "WORKSTREAM" | "EVENT";
  date?: string | null;
  visibility?: string | null;
}) {
  const target = input.targetType === "EVENT" ? "milestone" : "workstream";
  const dateText = input.date ? ` on ${input.date}` : "";
  const visibilityText = input.visibility ? ` to ${input.visibility}` : "";
  return `Understood: ${progressCommandLabel(input.command)} for ${input.projectLabel} / ${target}: ${input.targetLabel}${dateText}${visibilityText}. Create suggestion?`;
}

export async function interpretProjectProgressInstruction(formData: FormData) {
  const rawInstruction = asString(formData.get("rawInstruction"));
  const selectedProjectId = asString(formData.get("projectId"));
  const clientTimestamp = formData.get("clientTimestamp");
  const sourceType = normalizeProgressInstructionSource(formData.get("sourceType"));

  if (!rawInstruction) {
    return {
      ok: false,
      message: "Type or capture an instruction first.",
      interpretation: undefined,
    };
  }

  const config = await getProjectProgressAgentConfig();
  const enabledError = assertProjectProgressAgentEnabled(config);
  if (enabledError) return enabledError;
  const sourceError = assertProgressSourceEnabled(config, sourceType);
  if (sourceError) return sourceError;

  const parsedInstruction = parseProjectProgressNaturalLanguage(rawInstruction);
  const command = parsedInstruction.command as AgentCapabilityKey | null;
  const targetType = parsedInstruction.targetType;
  if (!command || !targetType) {
    return {
      ok: false,
      message: "I could not identify a supported progress command yet.",
      interpretation: {
        command: "UNKNOWN",
        targetType: null,
        confidence: "LOW" as const,
        rawInstruction,
        understoodText: "",
        clarification:
          "Try start, finish, reopen a workstream, or complete/reopen a milestone.",
        candidates: {},
      },
    };
  }

  const capabilityError = assertProjectProgressCapabilityEnabled(config, command);
  if (capabilityError) return capabilityError;

  const date = progressCommandDateRequired(command)
    ? dateOrClientToday(formData.get("date"), clientTimestamp)
    : null;
  const visibility = command.includes("VISIBILITY") ? parsedInstruction.visibility : null;
  const phaseReference = extractPhaseReference(rawInstruction);

  const [projects, projectWorkstreams, projectEvents] = await Promise.all([
    prisma.project.findMany({
      where: { isActive: true },
      orderBy: [{ projectCode: "asc" }, { name: "asc" }],
    }),
    prisma.projectWorkstream.findMany({
      where: {
        isActive: true,
        ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
      },
      include: { project: true, workstream: { include: { phase: true } } },
      orderBy: [
        { project: { projectCode: "asc" } },
        { workstream: { phase: { sortOrder: "asc" } } },
        { workstream: { sortOrder: "asc" } },
      ],
    }),
    prisma.projectEvent.findMany({
      where: {
        isActive: true,
        ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
      },
      include: { project: true },
      orderBy: [{ project: { projectCode: "asc" } }, { eventDate: "asc" }],
    }),
  ]);

  const phaseFilteredWorkstreamPool = phaseReference
    ? projectWorkstreams.filter((workstream) =>
        phaseNameMatchesReference(workstream.workstream.phase?.name, phaseReference)
      )
    : projectWorkstreams;

  if (targetType === "WORKSTREAM" && phaseReference && phaseFilteredWorkstreamPool.length === 0) {
    return {
      ok: false,
      message: `I found a phase reference (${phaseReference}), but no active workstream in that phase.`,
      interpretation: {
        command,
        targetType,
        confidence: "LOW" as const,
        rawInstruction,
        understoodText: "",
        date,
        visibility,
        clarification:
          "Please check that the selected project has an active workstream in that phase.",
        candidates: {
          workstreams: [],
          events: [],
        },
      },
    };
  }

  const workstreamPool =
    targetType === "WORKSTREAM" && phaseReference && phaseFilteredWorkstreamPool.length > 0
      ? phaseFilteredWorkstreamPool
      : projectWorkstreams;
  const uniquePhaseWorkstream =
    targetType === "WORKSTREAM" && phaseReference && phaseFilteredWorkstreamPool.length === 1
      ? phaseFilteredWorkstreamPool[0]
      : null;

  const workstreamRecords = workstreamPool
    .map((workstream) => {
      const name =
        workstream.reportingName || workstream.customName || workstream.workstream.name;
      const phase = workstream.workstream.phase?.name;
      return {
        id: workstream.id,
        label: `${projectLabel(workstream.project)} / ${phase ? `${phase} / ` : ""}${name}`,
        aliases: workstreamAliases(workstream),
      };
    });

  const eventRecords = projectEvents.map((event) => {
    const name = event.reportingName || event.customName || event.name;
    return {
      id: event.id,
      label: `${projectLabel(event.project)} / ${name}`,
      aliases: eventAliases(event),
    };
  });

  const workstreamCandidates = rankNaturalLanguageCandidates(rawInstruction, workstreamRecords);
  const eventCandidates = rankNaturalLanguageCandidates(rawInstruction, eventRecords);
  const effectiveWorkstreamCandidates =
    uniquePhaseWorkstream && workstreamCandidates.length === 0
      ? [
          {
            id: uniquePhaseWorkstream.id,
            label:
              workstreamRecords.find((record) => record.id === uniquePhaseWorkstream.id)
                ?.label ?? "",
            score: 8,
          },
        ]
      : workstreamCandidates;
  const candidates =
    targetType === "WORKSTREAM" ? effectiveWorkstreamCandidates : eventCandidates;
  const confidence = getCandidateConfidence(candidates);
  const targetId = candidates[0]?.id ?? "";

  const targetProjectWorkstream =
    targetType === "WORKSTREAM"
      ? projectWorkstreams.find((workstream) => workstream.id === targetId)
      : null;
  const targetEvent =
    targetType === "EVENT"
      ? projectEvents.find((event) => event.id === targetId)
      : null;
  const target = targetProjectWorkstream ?? targetEvent;

  if (!target) {
    return {
      ok: false,
      message: "I found the command, but could not match the target clearly.",
      interpretation: {
        command,
        targetType,
        confidence: "LOW" as const,
        rawInstruction,
        understoodText: "",
        date,
        visibility,
        clarification:
          targetType === "WORKSTREAM"
            ? "Choose a workstream candidate before creating the suggestion."
            : "Choose a milestone candidate before creating the suggestion.",
        candidates: {
          workstreams: effectiveWorkstreamCandidates,
          events: eventCandidates,
        },
      },
    };
  }

  const targetProject = target.project ?? projects.find((project) => project.id === target.projectId);
  const targetLabel =
    targetType === "WORKSTREAM"
      ? workstreamRecords.find((record) => record.id === targetId)?.label.split(" / ").slice(1).join(" / ") ?? ""
      : eventRecords.find((record) => record.id === targetId)?.label.split(" / ").slice(1).join(" / ") ?? "";
  const targetProjectLabel = targetProject ? projectLabel(targetProject) : "";

  return {
    ok: true,
    message: confidence === "LOW"
      ? "I found possible matches, but not enough confidence. Please correct the match before confirming."
      : "Instruction interpreted. Please confirm before creating the suggestion.",
    interpretation: {
      command,
      targetType,
      confidence,
      rawInstruction,
      projectId: target.projectId,
      projectLabel: targetProjectLabel,
      targetId,
      targetLabel,
      date,
      visibility,
      sourceType,
      understoodText: buildProjectProgressUnderstanding({
        command,
        projectLabel: targetProjectLabel,
        targetLabel,
        targetType,
        date,
        visibility,
      }),
      candidates: {
        workstreams: effectiveWorkstreamCandidates,
        events: eventCandidates,
      },
    },
  };
}

export async function createVisibilityCleanupSuggestion(formData: FormData) {
  const projectId = asString(formData.get("projectId"));
  if (!projectId) return progressAgentError("Project is required.");

  const workstreams = await prisma.projectWorkstream.findMany({
    where: {
      projectId,
      isActive: true,
      actualEndDate: { not: null },
      visibility: { in: ["EXECUTIVE", "BOTH"] },
    },
    include: { workstream: { include: { phase: true } } },
    orderBy: [
      { workstream: { phase: { sortOrder: "asc" } } },
      { workstream: { sortOrder: "asc" } },
    ],
  });

  if (workstreams.length === 0) {
    return progressAgentError("No completed executive-visible workstreams were found.");
  }

  const items = workstreams.map((workstream) => ({
    targetEntity: "PROJECT_WORKSTREAM" as const,
    targetRecordId: workstream.id,
    label: `${workstream.workstream.phase?.name ? `${workstream.workstream.phase.name} / ` : ""}${workstream.reportingName || workstream.customName || workstream.workstream.name}`,
    fromVisibility: workstream.visibility,
    toVisibility: "DETAILED",
  }));

  return createProgressSuggestion({
    capabilityKey: "MOVE_COMPLETED_ITEMS_TO_DETAILED",
    projectId,
    targetEntity: "PROJECT_WORKSTREAM",
    title: "Move completed items to Detailed",
    summary: `${items.length} completed executive-visible workstream(s) can move to Detailed.`,
    payload: {
      command: "MOVE_COMPLETED_ITEMS_TO_DETAILED",
      projectId,
      items,
    },
  });
}

function dateLabel(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function formatAccomplishmentsForReport(accomplishments: AccomplishmentsPayload) {
  const sections = [
    ["Completed workstreams", accomplishments.workstreams],
    ["Completed milestones", accomplishments.events],
    ["Closed risks", accomplishments.risks],
    ["Completed risk actions", accomplishments.riskActions],
    ["Approved / closed decisions", accomplishments.decisions],
  ] as const;

  const lines = [
    `Accomplishments since ${accomplishments.sourceReportingPackVersion ?? "last approved report"}${accomplishments.sinceDate ? ` (${accomplishments.sinceDate})` : ""}:`,
  ];

  for (const [title, items] of sections) {
    if (!items?.length) continue;
    lines.push("", title);
    for (const item of items) lines.push(`- ${item}`);
  }

  if (lines.length === 1) {
    lines.push("", "No accomplishments were detected since the last approved report.");
  }

  return lines.join("\n");
}

export async function createAccomplishmentsSuggestion(formData: FormData) {
  const projectId = asString(formData.get("projectId"));
  if (!projectId) return progressAgentError("Project is required.");

  const config = await getProjectProgressAgentConfig();
  const enabledError = assertProjectProgressAgentEnabled(config);
  if (enabledError) return enabledError;
  const capabilityError = assertProjectProgressCapabilityEnabled(
    config,
    "GENERATE_ACCOMPLISHMENTS_SINCE_REPORT"
  );
  if (capabilityError) return capabilityError;

  const [project, lastApprovedReport] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.projectReportingPack.findFirst({
      where: { projectId, status: "APPROVED" },
      orderBy: [{ reportingDate: "desc" }, { version: "desc" }],
    }),
  ]);

  if (!project) return progressAgentError("Project not found.");
  if (!lastApprovedReport) {
    return progressAgentError("No approved reporting pack was found for this project.");
  }

  const sinceDate = lastApprovedReport.reportingDate;
  const closedStatusCodes = ["APPROVED", "CLOSED"];

  const [workstreams, events, risks, riskActions, decisions] = await Promise.all([
    prisma.projectWorkstream.findMany({
      where: { projectId, isActive: true, actualEndDate: { gte: sinceDate } },
      include: { workstream: { include: { phase: true } } },
      orderBy: [
        { actualEndDate: "asc" },
        { workstream: { phase: { sortOrder: "asc" } } },
        { workstream: { sortOrder: "asc" } },
      ],
    }),
    prisma.projectEvent.findMany({
      where: {
        projectId,
        isActive: true,
        isCompleted: true,
        completionDate: { gte: sinceDate },
      },
      orderBy: [{ completionDate: "asc" }, { eventDate: "asc" }],
    }),
    prisma.projectRisk.findMany({
      where: {
        projectId,
        isActive: true,
        updatedAt: { gte: sinceDate },
        status: { code: { in: closedStatusCodes } },
      },
      include: { status: true },
      orderBy: [{ updatedAt: "asc" }, { title: "asc" }],
    }),
    prisma.projectRiskAction.findMany({
      where: {
        updatedAt: { gte: sinceDate },
        statusRef: { code: { in: closedStatusCodes } },
        projectRisk: { projectId },
      },
      include: { projectRisk: true, statusRef: true },
      orderBy: [{ updatedAt: "asc" }, { description: "asc" }],
    }),
    prisma.projectDecision.findMany({
      where: {
        projectId,
        isActive: true,
        updatedAt: { gte: sinceDate },
        statusRef: { code: { in: closedStatusCodes } },
      },
      include: { statusRef: true },
      orderBy: [{ updatedAt: "asc" }, { title: "asc" }],
    }),
  ]);

  const accomplishments = {
    sinceDate: dateLabel(sinceDate),
    sourceReportingPackId: lastApprovedReport.id,
    sourceReportingPackVersion: `v${lastApprovedReport.version}`,
    workstreams: workstreams.map((workstream) => {
      const phase = workstream.workstream.phase?.name;
      const name =
        workstream.reportingName || workstream.customName || workstream.workstream.name;
      return `${phase ? `${phase} / ` : ""}${name} (${dateLabel(workstream.actualEndDate)})`;
    }),
    events: events.map((event) => {
      const name = event.reportingName || event.customName || event.name;
      return `${name} (${dateLabel(event.completionDate)})`;
    }),
    risks: risks.map((risk) => `${risk.title} (${risk.status.name})`),
    riskActions: riskActions.map(
      (action) => `${action.projectRisk.title}: ${action.description} (${action.statusRef.name})`
    ),
    decisions: decisions.map((decision) => `${decision.title} (${decision.statusRef.name})`),
  };

  const itemCount =
    accomplishments.workstreams.length +
    accomplishments.events.length +
    accomplishments.risks.length +
    accomplishments.riskActions.length +
    accomplishments.decisions.length;

  const user = await getOneUserAgentUser();
  const capability = getProjectProgressCapability(
    config,
    "GENERATE_ACCOMPLISHMENTS_SINCE_REPORT"
  );
  const payload: ProgressPayload = {
    command: "GENERATE_ACCOMPLISHMENTS_SINCE_REPORT",
    projectId,
    targetEntity: "PROJECT",
    targetRecordId: projectId,
    accomplishments,
  };

  await prisma.$transaction(async (tx) => {
    const instruction = await createTextAgentInstruction(tx, {
      agentKey: PROJECT_PROGRESS_AGENT_KEY,
      userId: user?.id ?? null,
      projectId,
      rawInstruction: "Generate accomplishments since last approved report",
      parsedIntent: payload as AgentJsonValue,
    });

    const suggestion = await createAgentSuggestion(tx, {
      instructionId: instruction.id,
      agentKey: PROJECT_PROGRESS_AGENT_KEY,
      capabilityId: capability?.id ?? null,
      suggestionType: "GENERATE_REPORTING_NARRATIVE",
      targetEntity: "PROJECT",
      targetRecordId: projectId,
      title: "Accomplishments since last approved report",
      summary: `${itemCount} accomplishment item(s) found since ${dateLabel(sinceDate)}.`,
      payload: payload as AgentJsonValue,
      configSnapshot: getProjectProgressConfigSnapshot(
        config,
        "GENERATE_ACCOMPLISHMENTS_SINCE_REPORT"
      ),
    });

    await createAgentActionLog(tx, {
      agentKey: PROJECT_PROGRESS_AGENT_KEY,
      actionType: "PROJECT_PROGRESS_SUGGESTION_CREATED",
      actorUserId: user?.id ?? null,
      instructionId: instruction.id,
      suggestionId: suggestion.id,
      message: "Project accomplishments suggestion created.",
      after: payload as AgentJsonValue,
    });
  });

  revalidateProgress(projectId);
  return progressAgentOk("Accomplishments suggestion created.");
}

export async function approveProjectProgressSuggestion(formData: FormData) {
  const id = asString(formData.get("id"));
  if (!id) return progressAgentError("Suggestion not approved: missing id.");

  const suggestion = await prisma.agentSuggestion.findUnique({
    where: { id },
    include: { instruction: true },
  });
  if (!suggestion) return progressAgentError("Suggestion no longer exists.");
  if (suggestion.appliedAt) return progressAgentError("Suggestion already applied.");

  const payload = parseAgentJson<ProgressPayload>(suggestion.payloadJson, {});
  const editedTargetRecordId = asString(formData.get("targetRecordId"));
  const editedDate = asString(formData.get("date"));
  const editedVisibility = normalizeProjectVisibility(formData.get("visibility"));
  const approvalPayload: ProgressPayload = {
    ...payload,
    targetRecordId:
      editedTargetRecordId &&
      [
        "START_WORKSTREAM",
        "FINISH_WORKSTREAM",
        "REOPEN_WORKSTREAM",
        "CHANGE_WORKSTREAM_VISIBILITY",
        "COMPLETE_EVENT",
        "REOPEN_EVENT",
        "CHANGE_EVENT_VISIBILITY",
      ].includes(payload.command ?? "")
        ? editedTargetRecordId
        : payload.targetRecordId,
    date:
      editedDate &&
      ["START_WORKSTREAM", "FINISH_WORKSTREAM", "COMPLETE_EVENT"].includes(
        payload.command ?? ""
      )
        ? editedDate
        : payload.date,
    visibility:
      editedVisibility &&
      ["CHANGE_WORKSTREAM_VISIBILITY", "CHANGE_EVENT_VISIBILITY"].includes(
        payload.command ?? ""
      )
        ? editedVisibility
        : payload.visibility,
  };
  const selectedItemIds = new Set(
    formData.getAll("selectedItemIds").map((value) => String(value))
  );
  const selectedItems =
    approvalPayload.command === "MOVE_COMPLETED_ITEMS_TO_DETAILED"
      ? (approvalPayload.items ?? []).filter((item) => selectedItemIds.has(item.targetRecordId))
      : approvalPayload.items;

  if (approvalPayload.command === "MOVE_COMPLETED_ITEMS_TO_DETAILED" && selectedItems?.length === 0) {
    return progressAgentError("Select at least one workstream to approve.");
  }

  const approvalProjectId = projectIdForPayload(approvalPayload);

  if (
    approvalProjectId &&
    approvalPayload.targetRecordId &&
    [
      "START_WORKSTREAM",
      "FINISH_WORKSTREAM",
      "REOPEN_WORKSTREAM",
      "CHANGE_WORKSTREAM_VISIBILITY",
    ].includes(approvalPayload.command ?? "")
  ) {
    const workstream = await prisma.projectWorkstream.findFirst({
      where: {
        id: approvalPayload.targetRecordId,
        projectId: approvalProjectId,
      },
      select: { id: true },
    });
    if (!workstream) return progressAgentError("Suggestion not approved: selected workstream is not in the suggestion project.");
  }

  if (
    approvalProjectId &&
    approvalPayload.targetRecordId &&
    ["COMPLETE_EVENT", "REOPEN_EVENT", "CHANGE_EVENT_VISIBILITY"].includes(
      approvalPayload.command ?? ""
    )
  ) {
    const event = await prisma.projectEvent.findFirst({
      where: {
        id: approvalPayload.targetRecordId,
        projectId: approvalProjectId,
      },
      select: { id: true },
    });
    if (!event) return progressAgentError("Suggestion not approved: selected milestone is not in the suggestion project.");
  }

  const [approvalStatus, suggestionStatus] = await Promise.all([
    getAgentStatusByCodeForScope(prisma, "AGENT_APPROVAL", "APPROVED"),
    getAgentStatusByCodeForScope(prisma, "AGENT_SUGGESTION", "APPROVED"),
  ]);
  if (!approvalStatus || !suggestionStatus) {
    return progressAgentError("Suggestion not approved: missing approval status setup.");
  }

  const user = await getOneUserAgentUser();
  const projectId = approvalPayload.projectId ?? suggestion.instruction.projectId ?? null;
  const draftReportingPack =
    approvalPayload.command === "GENERATE_ACCOMPLISHMENTS_SINCE_REPORT" && projectId
      ? await prisma.projectReportingPack.findMany({
          where: { projectId, status: "DRAFT", isActive: true },
          orderBy: [{ version: "desc" }, { createdAt: "desc" }],
          take: 2,
        })
      : [];

  if (approvalPayload.command === "GENERATE_ACCOMPLISHMENTS_SINCE_REPORT") {
    if (!approvalPayload.accomplishments) {
      return progressAgentError("Suggestion cannot be applied: accomplishments payload is missing.");
    }
    if (draftReportingPack.length === 0) {
      return progressAgentError("No active draft reporting pack was found. Create a draft pack before approving this suggestion.");
    }
    if (draftReportingPack.length > 1) {
      return progressAgentError("More than one active draft reporting pack was found. Keep only one draft open before approving this suggestion.");
    }
  }

  let alreadyApplied = false;

  await prisma.$transaction(async (tx) => {
    const claimedSuggestion = await claimAgentSuggestionApplication(tx, {
      suggestionId: id,
      approvedStatusId: suggestionStatus.id,
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
        decisionNotes: "Approved from Project Progress Assistant.",
        decidedAt: new Date(),
      },
    });

    if (approvalPayload.command === "START_WORKSTREAM" && approvalPayload.targetRecordId && approvalPayload.date) {
      await tx.projectWorkstream.update({
        where: { id: approvalPayload.targetRecordId },
        data: { actualStartDate: new Date(approvalPayload.date) },
      });
    } else if (approvalPayload.command === "FINISH_WORKSTREAM" && approvalPayload.targetRecordId && approvalPayload.date) {
      await tx.projectWorkstream.update({
        where: { id: approvalPayload.targetRecordId },
        data: { actualEndDate: new Date(approvalPayload.date) },
      });
    } else if (approvalPayload.command === "REOPEN_WORKSTREAM" && approvalPayload.targetRecordId) {
      await tx.projectWorkstream.update({
        where: { id: approvalPayload.targetRecordId },
        data: { actualEndDate: null },
      });
    } else if (approvalPayload.command === "CHANGE_WORKSTREAM_VISIBILITY" && approvalPayload.targetRecordId && approvalPayload.visibility) {
      await tx.projectWorkstream.update({
        where: { id: approvalPayload.targetRecordId },
        data: { visibility: approvalPayload.visibility },
      });
    } else if (approvalPayload.command === "COMPLETE_EVENT" && approvalPayload.targetRecordId && approvalPayload.date) {
      const completionDate = new Date(approvalPayload.date);
      await tx.projectEvent.update({
        where: { id: approvalPayload.targetRecordId },
        data: {
          isCompleted: true,
          eventDate: completionDate,
          completionDate,
        },
      });
    } else if (approvalPayload.command === "REOPEN_EVENT" && approvalPayload.targetRecordId) {
      await tx.projectEvent.update({
        where: { id: approvalPayload.targetRecordId },
        data: { isCompleted: false, completionDate: null },
      });
    } else if (approvalPayload.command === "CHANGE_EVENT_VISIBILITY" && approvalPayload.targetRecordId && approvalPayload.visibility) {
      await tx.projectEvent.update({
        where: { id: approvalPayload.targetRecordId },
        data: { visibility: approvalPayload.visibility },
      });
    } else if (approvalPayload.command === "MOVE_COMPLETED_ITEMS_TO_DETAILED" && selectedItems?.length) {
      for (const item of selectedItems) {
        await tx.projectWorkstream.update({
          where: { id: item.targetRecordId },
          data: { visibility: item.toVisibility ?? "DETAILED" },
        });
      }
    } else if (
      approvalPayload.command === "GENERATE_ACCOMPLISHMENTS_SINCE_REPORT" &&
      approvalPayload.accomplishments &&
      draftReportingPack[0]
    ) {
      await tx.projectReportingPack.update({
        where: { id: draftReportingPack[0].id },
        data: { achievements: formatAccomplishmentsForReport(approvalPayload.accomplishments) },
      });
    }

    await createAgentActionLog(tx, {
      agentKey: PROJECT_PROGRESS_AGENT_KEY,
      actionType: "PROJECT_PROGRESS_SUGGESTION_APPLIED",
      actorUserId: user?.id ?? null,
      instructionId: suggestion.instructionId,
      suggestionId: id,
      approvalId: approval.id,
      message: "Project progress suggestion approved and applied.",
      after: {
        ...(approvalPayload as Record<string, AgentJsonValue>),
        originalTargetRecordId: payload.targetRecordId ?? null,
        originalDate: payload.date ?? null,
        originalVisibility: payload.visibility ?? null,
        selectedItemIds: Array.from(selectedItemIds),
        reportingPackId:
          approvalPayload.command === "GENERATE_ACCOMPLISHMENTS_SINCE_REPORT"
            ? draftReportingPack[0]?.id ?? null
            : null,
      },
    });
  });

  revalidateProgress(projectId);
  if (projectId) {
    revalidatePath(`/reporting-packs?projectId=${projectId}`);
    revalidatePath("/reporting-packs");
    revalidatePath("/executive-report/export");
  }
  if (alreadyApplied) {
    return progressAgentOk("Suggestion already applied. No duplicate update was performed.");
  }
  return progressAgentOk("Suggestion approved and applied.");
}

export async function rejectProjectProgressSuggestion(formData: FormData) {
  const id = asString(formData.get("id"));
  if (!id) return progressAgentError("Suggestion not rejected: missing id.");

  const suggestion = await prisma.agentSuggestion.findUnique({
    where: { id },
    include: { instruction: true },
  });
  if (!suggestion) return progressAgentError("Suggestion no longer exists.");

  const [approvalStatus, suggestionStatus] = await Promise.all([
    getAgentStatusByCodeForScope(prisma, "AGENT_APPROVAL", "REJECTED"),
    getAgentStatusByCodeForScope(prisma, "AGENT_SUGGESTION", "REJECTED"),
  ]);
  if (!approvalStatus || !suggestionStatus) {
    return progressAgentError("Suggestion not rejected: missing rejection status setup.");
  }

  const user = await getOneUserAgentUser();
  await prisma.$transaction(async (tx) => {
    const approval = await tx.agentApproval.create({
      data: {
        suggestionId: id,
        approverUserId: user?.id ?? null,
        statusId: approvalStatus.id,
        decisionNotes: "Rejected from Project Progress Assistant.",
        decidedAt: new Date(),
      },
    });

    await tx.agentSuggestion.update({
      where: { id },
      data: { statusId: suggestionStatus.id },
    });

    await createAgentActionLog(tx, {
      agentKey: PROJECT_PROGRESS_AGENT_KEY,
      actionType: "SUGGESTION_REJECTED",
      actorUserId: user?.id ?? null,
      instructionId: suggestion.instructionId,
      suggestionId: id,
      approvalId: approval.id,
      message: "Project progress suggestion rejected.",
    });
  });

  revalidateProgress(suggestion.instruction.projectId);
  return progressAgentOk("Suggestion rejected.");
}
