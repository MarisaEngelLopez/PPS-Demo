import { prisma } from "@/lib/prisma";
import {
  deriveRiskLifecycleSummary,
  type RiskLifecycleConfig,
} from "@/lib/domain/risks/riskLifecycle";

export type AttentionCategory =
  | "Workstream"
  | "Milestone"
  | "Risk"
  | "Risk Action"
  | "Decision"
  | "Reporting"
  | "Time Tracking"
  | "Agent Suggestion";

export type AttentionSeverity = "Critical" | "High" | "Medium" | "Low";

export type AttentionItem = {
  id: string;
  category: AttentionCategory;
  severity: AttentionSeverity;
  projectId: string;
  projectCode: string;
  projectName: string;
  title: string;
  description: string;
  dueDate: string;
  owner: string;
  attentionReason: string;
  actionLabel: string;
  actionHref: string;
};

const HIGH_RISK_EXPOSURE_THRESHOLD = 12;
const STALE_REPORT_DAYS_THRESHOLD = 35;
const RISK_LIFECYCLE_ATTENTION_LOOKAHEAD_DAYS = 7;
const AGENT_SUGGESTION_OVERDUE_HOURS = 24;
const REPORTING_REQUIRED_PROJECT_STATUS_CODES = new Set(["ACTIVE", "IN_PROGRESS"]);
const SEVERITY_RANK: Record<AttentionSeverity, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3,
};

function highestSeverity(values: AttentionSeverity[]) {
  return values.reduce((highest, value) =>
    SEVERITY_RANK[value] > SEVERITY_RANK[highest] ? value : highest
  );
}

function startOfLocalDay(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function dateOnly(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function daysBetween(from: Date, to: Date) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / oneDay);
}

function addHours(value: Date, hours: number) {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function parseJsonObject(value: string | null | undefined) {
  if (!value) return {};

  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function isWithinAttentionWindow(
  dueDate: Date | string | null | undefined,
  today: Date,
  lookaheadDays: number
) {
  if (!dueDate) return true;
  return daysBetween(today, new Date(dueDate)) <= lookaheadDays;
}

function workstreamLabel(workstream: {
  customName?: string | null;
  reportingName?: string | null;
  workstream: { name: string; phase?: { name: string } | null };
}) {
  const phase = workstream.workstream.phase?.name;
  const name =
    workstream.reportingName || workstream.customName || workstream.workstream.name;
  return `${phase ? `${phase} / ` : ""}${name}`;
}

function eventLabel(event: {
  customName?: string | null;
  reportingName?: string | null;
  name: string;
}) {
  return event.reportingName || event.customName || event.name;
}

function projectLabel(project: { projectCode: string; name: string }) {
  return `${project.projectCode} - ${project.name}`;
}

function projectRequiresReporting(project: { governedStatus?: { code: string } | null }) {
  return REPORTING_REQUIRED_PROJECT_STATUS_CODES.has(project.governedStatus?.code ?? "");
}

function projectWorkstreamHref(projectId: string, workstreamId: string) {
  return `/projects/${projectId}?view=management#project-workstream-${workstreamId}`;
}

function projectEventHref(projectId: string, eventId: string) {
  return `/projects/${projectId}?view=management#project-event-${eventId}`;
}

function riskHref(riskId: string) {
  return `/risks#risk-${riskId}`;
}

function riskActionHref(actionId: string) {
  return `/risks#risk-action-${actionId}`;
}

function decisionHref(decisionId: string) {
  return `/decisions#decision-${decisionId}`;
}

function projectReportingWorkspaceHref(projectId: string) {
  return `/projects/${projectId}?view=narrative#executive-reporting-workspace`;
}

function timeTrackingAssistantHref() {
  return "/time-tracking/assistant";
}

function projectProgressAssistantHref() {
  return "/projects/progress-assistant";
}

function agentSuggestionHref(agentKey: string) {
  return agentKey === "PROJECT_PROGRESS"
    ? projectProgressAssistantHref()
    : timeTrackingAssistantHref();
}

function agentSuggestionAgentLabel(agentKey: string) {
  return agentKey === "PROJECT_PROGRESS"
    ? "Project Progress Assistant"
    : agentKey === "TIME_TRACKING"
      ? "Time Tracking Assistant"
      : "Agent";
}

function statusIsClosed(status?: { code: string } | null) {
  return ["APPROVED", "CLOSED", "COMPLETED"].includes(status?.code ?? "");
}

function riskLifecycleConfigFromRisks(
  risks: {
    status?: { code: string } | null;
    riskActions: { statusRef?: { code: string } | null }[];
  }[]
): RiskLifecycleConfig {
  return {
    closedRiskStatusCodes: [
      "CLOSE",
      "CLOSED",
      "APPROVED",
      "COMPLETED",
      ...risks
        .map((risk) => risk.status?.code)
        .filter((code): code is string => Boolean(code && statusIsClosed({ code }))),
    ],
    openRiskActionStatusCodes: ["OPEN", "IN_PROGRESS", "ACTIVE"],
    closedRiskActionStatusCodes: ["DONE", "CLOSE", "CLOSED", "COMPLETED"],
  };
}

function itemSortValue(item: AttentionItem) {
  const severityRank: Record<AttentionSeverity, number> = {
    Critical: 0,
    High: 1,
    Medium: 2,
    Low: 3,
  };
  return `${severityRank[item.severity]}|${item.dueDate || "9999-12-31"}|${item.projectCode}|${item.category}|${item.title}`;
}

export async function getDailyAttentionItems(now = new Date()): Promise<AttentionItem[]> {
  const today = startOfLocalDay(now);
  const agentSuggestionCutoff = new Date(
    now.getTime() - AGENT_SUGGESTION_OVERDUE_HOURS * 60 * 60 * 1000
  );
  const [
    workstreams,
    events,
    risks,
    riskActions,
    decisions,
    projects,
    workSessions,
    agentSuggestions,
  ] =
    await Promise.all([
      prisma.projectWorkstream.findMany({
        where: { isActive: true },
        include: {
          project: true,
          workstream: { include: { phase: true } },
        },
      }),
      prisma.projectEvent.findMany({
        where: { isActive: true },
        include: { project: true },
      }),
      prisma.projectRisk.findMany({
        where: { isActive: true },
        include: {
          project: true,
          status: true,
          owner: true,
          assessments: true,
          reviews: {
            include: { reviewOutcome: true },
            orderBy: [{ reviewDate: "desc" }, { createdAt: "desc" }],
          },
          riskActions: {
            include: {
              statusRef: true,
              evidenceRecords: true,
            },
          },
        },
      }),
      prisma.projectRiskAction.findMany({
        include: {
          owner: true,
          statusRef: true,
          projectRisk: { include: { project: true } },
        },
      }),
      prisma.projectDecision.findMany({
        where: { isActive: true },
        include: {
          project: true,
          statusRef: true,
        },
      }),
      prisma.project.findMany({
        where: { isActive: true },
        include: {
          governedStatus: true,
          projectManagerContact: true,
          reportingPacks: {
            where: { isActive: true },
            orderBy: [{ reportingDate: "desc" }, { version: "desc" }],
            take: 1,
          },
        },
      }),
      prisma.workSession.findMany({
        where: {
          convertedTimeEntryId: null,
          status: { code: { in: ["IN_PROGRESS", "ON_HOLD"] } },
        },
        include: {
          project: true,
          projectWorkstream: {
            include: { workstream: { include: { phase: true } } },
          },
          taskFamily: true,
          status: true,
        },
        orderBy: [{ startedAt: "asc" }],
      }),
      prisma.agentSuggestion.findMany({
        where: {
          appliedAt: null,
          createdAt: { lte: agentSuggestionCutoff },
          status: { code: "OPEN" },
        },
        include: {
          instruction: { include: { project: true } },
        },
        orderBy: [{ createdAt: "asc" }],
      }),
    ]);

  const items: AttentionItem[] = [];
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const riskLifecycleConfig = riskLifecycleConfigFromRisks(risks);

  for (const suggestion of agentSuggestions) {
    const payload = parseJsonObject(suggestion.payloadJson);
    const payloadProjectId =
      typeof payload.projectId === "string" ? payload.projectId : null;
    const project =
      (payloadProjectId ? projectById.get(payloadProjectId) : null) ??
      (suggestion.instruction.projectId
        ? projectById.get(suggestion.instruction.projectId)
        : null);

    if (!project) continue;

    const overdueAt = addHours(
      suggestion.createdAt,
      AGENT_SUGGESTION_OVERDUE_HOURS
    );
    const overdueHours = Math.max(
      0,
      Math.floor((now.getTime() - overdueAt.getTime()) / (60 * 60 * 1000))
    );
    const overdueDays = Math.floor(overdueHours / 24);
    const agentLabel = agentSuggestionAgentLabel(suggestion.agentKey);

    items.push({
      id: `agent-suggestion-overdue-${suggestion.id}`,
      category: "Agent Suggestion",
      severity: overdueDays >= 2 ? "High" : "Medium",
      projectId: project.id,
      projectCode: project.projectCode,
      projectName: project.name,
      title: suggestion.title,
      description:
        suggestion.summary ||
        "Agent suggestion is open and waiting for review or rejection.",
      dueDate: dateOnly(overdueAt),
      owner: agentLabel,
      attentionReason:
        overdueDays > 0
          ? `Open suggestion is overdue by ${overdueDays} day(s).`
          : `Open suggestion has been waiting more than ${AGENT_SUGGESTION_OVERDUE_HOURS} hours.`,
      actionLabel: `Open ${agentLabel}`,
      actionHref: agentSuggestionHref(suggestion.agentKey),
    });
  }

  for (const session of workSessions) {
    const isPaused = session.status.code === "ON_HOLD";
    const openDays = daysBetween(session.startedAt, today);
    items.push({
      id: `time-session-${session.id}`,
      category: "Time Tracking",
      severity: openDays > 0 ? "High" : "Medium",
      projectId: session.project.id,
      projectCode: session.project.projectCode,
      projectName: session.project.name,
      title: workstreamLabel(session.projectWorkstream),
      description: isPaused
        ? "Time tracking session is paused and waiting to resume or finish."
        : "Time tracking session is still open and should be paused or finished.",
      dueDate: dateOnly(session.startedAt),
      owner: projectLabel(session.project),
      attentionReason: isPaused
        ? "Paused work session is still open."
        : "Active work session is still open.",
      actionLabel: "Open Time Tracking",
      actionHref: timeTrackingAssistantHref(),
    });
  }

  for (const workstream of workstreams) {
    const title = workstreamLabel(workstream);
    const project = workstream.project;
    const actionHref = projectWorkstreamHref(project.id, workstream.id);
    const owner = projectLabel(project);

    if (workstream.plannedStartDate && !workstream.actualStartDate && workstream.plannedStartDate < today) {
      const overdueDays = daysBetween(workstream.plannedStartDate, today);
      items.push({
        id: `workstream-start-${workstream.id}`,
        category: "Workstream",
        severity: overdueDays >= 7 ? "High" : "Medium",
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        title,
        description: "Workstream has no actual start date although the planned start date has passed.",
        dueDate: dateOnly(workstream.plannedStartDate),
        owner,
        attentionReason: `Planned start passed by ${overdueDays} day(s).`,
        actionLabel: "Open Workstream",
        actionHref,
      });
    }

    if (workstream.plannedEndDate && !workstream.actualEndDate && workstream.plannedEndDate < today) {
      const overdueDays = daysBetween(workstream.plannedEndDate, today);
      items.push({
        id: `workstream-end-${workstream.id}`,
        category: "Workstream",
        severity: overdueDays >= 7 ? "High" : "Medium",
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        title,
        description: "Workstream is still open although the planned end date has passed.",
        dueDate: dateOnly(workstream.plannedEndDate),
        owner,
        attentionReason: `Planned end passed by ${overdueDays} day(s).`,
        actionLabel: "Open Workstream",
        actionHref,
      });
    }
  }

  for (const event of events) {
    if (event.isCompleted || event.eventDate >= today) continue;
    const overdueDays = daysBetween(event.eventDate, today);
    items.push({
      id: `milestone-overdue-${event.id}`,
      category: "Milestone",
      severity: overdueDays >= 7 ? "High" : "Medium",
      projectId: event.project.id,
      projectCode: event.project.projectCode,
      projectName: event.project.name,
      title: eventLabel(event),
      description: "Milestone date has passed and the milestone is not completed.",
      dueDate: dateOnly(event.eventDate),
      owner: projectLabel(event.project),
      attentionReason: `Milestone overdue by ${overdueDays} day(s).`,
      actionLabel: "Open Milestone",
      actionHref: projectEventHref(event.project.id, event.id),
    });
  }

  for (const risk of risks) {
    const project = risk.project;
    const lifecycle = deriveRiskLifecycleSummary(risk, riskLifecycleConfig);
    const actionHref = riskHref(risk.id);
    const isEligible =
      !lifecycle.isClosed &&
      (risk.escalated ||
        isWithinAttentionWindow(
          risk.targetResolutionDate,
          today,
          RISK_LIFECYCLE_ATTENTION_LOOKAHEAD_DAYS
        ));
    if (!isEligible) continue;

    const reasons: string[] = [];
    const severities: AttentionSeverity[] = [];
    let actionLabel = "Open Risk";

    if (risk.escalated) {
      reasons.push("Risk is escalated.");
      severities.push("High");
    }
    if (risk.exposure >= HIGH_RISK_EXPOSURE_THRESHOLD) {
      reasons.push(`Exposure ${risk.exposure}.`);
      severities.push(risk.exposure >= 16 ? "Critical" : "High");
    }
    if (risk.riskActions.length === 0) {
      reasons.push("No mitigation actions recorded.");
      severities.push("Medium");
    }
    if (lifecycle.actionTotal > 0 && lifecycle.evidenceCount === 0) {
      reasons.push("No evidence recorded for mitigation actions.");
      severities.push("Medium");
      actionLabel = "Open Risk Evidence";
    }
    if (lifecycle.stageKey === "RESIDUAL_ASSESSMENT") {
      reasons.push("Residual assessment pending.");
      severities.push("Medium");
      actionLabel = "Open Risk Assessment";
    }
    if (lifecycle.needsManagementReview) {
      reasons.push("Management review pending.");
      severities.push(risk.exposure >= HIGH_RISK_EXPOSURE_THRESHOLD ? "High" : "Medium");
      actionLabel = "Open Management Review";
    }
    if (reasons.length === 0) continue;

    items.push({
      id: `risk-${risk.id}`,
      category: "Risk",
      severity: highestSeverity(severities),
      projectId: project.id,
      projectCode: project.projectCode,
      projectName: project.name,
      title: risk.title,
      description: "Risk requires attention for one or more reasons.",
      dueDate: dateOnly(risk.targetResolutionDate),
      owner: risk.owner?.fullName ?? "-",
      attentionReason: reasons.join(" | "),
      actionLabel,
      actionHref,
    });
  }

  for (const action of riskActions) {
    if (statusIsClosed(action.statusRef) || !action.dueDate || action.dueDate >= today) continue;
    const overdueDays = daysBetween(action.dueDate, today);
    const project = action.projectRisk.project;
    items.push({
      id: `risk-action-overdue-${action.id}`,
      category: "Risk Action",
      severity: overdueDays >= 7 ? "High" : "Medium",
      projectId: project.id,
      projectCode: project.projectCode,
      projectName: project.name,
      title: action.description,
      description: `Risk action for: ${action.projectRisk.title}`,
      dueDate: dateOnly(action.dueDate),
      owner: action.owner?.fullName ?? "-",
      attentionReason: `Risk action overdue by ${overdueDays} day(s).`,
      actionLabel: "Open Risk Action",
      actionHref: riskActionHref(action.id),
    });
  }

  for (const decision of decisions) {
    const isClosed = statusIsClosed(decision.statusRef);
    const project = decision.project;
    if (!isClosed && decision.dueDate && decision.dueDate < today) {
      const overdueDays = daysBetween(decision.dueDate, today);
      items.push({
        id: `decision-overdue-${decision.id}`,
        category: "Decision",
        severity: decision.impact === "CRITICAL" ? "Critical" : "High",
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        title: decision.title,
        description: "Decision due date has passed and the decision is not closed.",
        dueDate: dateOnly(decision.dueDate),
        owner: decision.owner || "-",
        attentionReason: `Decision overdue by ${overdueDays} day(s).`,
        actionLabel: "Open Decision",
        actionHref: decisionHref(decision.id),
      });
    } else if (!isClosed && decision.escalated) {
      items.push({
        id: `decision-escalated-${decision.id}`,
        category: "Decision",
        severity: decision.impact === "CRITICAL" ? "Critical" : "Medium",
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        title: decision.title,
        description: "Decision is escalated and still open.",
        dueDate: dateOnly(decision.dueDate),
        owner: decision.owner || "-",
        attentionReason: "Escalated decision.",
        actionLabel: "Open Decision",
        actionHref: decisionHref(decision.id),
      });
    }
  }

  for (const project of projects) {
    if (!projectRequiresReporting(project)) continue;
    const latestReport = project.reportingPacks[0];
    if (!latestReport) {
      items.push({
        id: `report-missing-${project.id}`,
        category: "Reporting",
        severity: "Medium",
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        title: "No reporting pack found",
        description: "Project has no active reporting pack.",
        dueDate: "",
        owner: project.projectManagerContact?.name ?? "-",
        attentionReason: "No active report exists for the project.",
        actionLabel: "Open Reporting",
        actionHref: projectReportingWorkspaceHref(project.id),
      });
      continue;
    }

    if (latestReport.status === "READY") {
      items.push({
        id: `report-ready-${latestReport.id}`,
        category: "Reporting",
        severity: "Medium",
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        title: latestReport.title,
        description: "Reporting pack is ready and waiting for approval.",
        dueDate: dateOnly(latestReport.reportingDate),
        owner: project.projectManagerContact?.name ?? "-",
        attentionReason: "Reporting pack pending approval.",
        actionLabel: "Open Reporting Pack",
        actionHref: `/reporting-packs?projectId=${project.id}`,
      });
    }

    const reportAge = daysBetween(latestReport.reportingDate, today);
    if (reportAge > STALE_REPORT_DAYS_THRESHOLD) {
      items.push({
        id: `report-stale-${latestReport.id}`,
        category: "Reporting",
        severity: "High",
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        title: latestReport.title,
        description: "Latest report is older than the attention threshold.",
        dueDate: dateOnly(latestReport.reportingDate),
        owner: project.projectManagerContact?.name ?? "-",
        attentionReason: `Latest report is ${reportAge} day(s) old.`,
        actionLabel: "Open Reporting Pack",
        actionHref: `/reporting-packs?projectId=${project.id}`,
      });
    }
  }

  return items.sort((a, b) => itemSortValue(a).localeCompare(itemSortValue(b)));
}
