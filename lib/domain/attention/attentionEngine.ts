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
  | "Time Tracking";

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
const REPORTING_REQUIRED_PROJECT_STATUS_CODES = new Set(["ACTIVE", "IN_PROGRESS"]);

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
  return `/projects/${projectId}#project-workstream-${workstreamId}`;
}

function projectEventHref(projectId: string, eventId: string) {
  return `/projects/${projectId}#project-event-${eventId}`;
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
  return `/projects/${projectId}#executive-reporting-workspace`;
}

function timeTrackingAssistantHref() {
  return "/time-tracking/assistant";
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
  const [workstreams, events, risks, riskActions, decisions, projects, workSessions] =
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
    ]);

  const items: AttentionItem[] = [];
  const riskLifecycleConfig = riskLifecycleConfigFromRisks(risks);

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

    if (!lifecycle.isClosed && risk.exposure >= HIGH_RISK_EXPOSURE_THRESHOLD) {
      items.push({
        id: `risk-exposure-${risk.id}`,
        category: "Risk",
        severity: risk.exposure >= 16 ? "Critical" : "High",
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        title: risk.title,
        description: "Risk exposure is above the attention threshold.",
        dueDate: dateOnly(risk.targetResolutionDate),
        owner: risk.owner?.fullName ?? "-",
        attentionReason: `Exposure ${risk.exposure}.`,
        actionLabel: "Open Risk",
        actionHref,
      });
    }

    if (!lifecycle.isClosed && risk.riskActions.length === 0) {
      items.push({
        id: `risk-no-actions-${risk.id}`,
        category: "Risk",
        severity: "Medium",
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        title: risk.title,
        description: "Risk has no mitigation actions.",
        dueDate: dateOnly(risk.targetResolutionDate),
        owner: risk.owner?.fullName ?? "-",
        attentionReason: "No mitigation actions recorded.",
        actionLabel: "Open Risk",
        actionHref,
      });
    }

    if (
      !lifecycle.isClosed &&
      lifecycle.actionTotal > 0 &&
      lifecycle.evidenceCount === 0
    ) {
      items.push({
        id: `risk-no-evidence-${risk.id}`,
        category: "Risk",
        severity: "Medium",
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        title: risk.title,
        description: "Risk mitigation has actions but no structured evidence records.",
        dueDate: dateOnly(risk.targetResolutionDate),
        owner: risk.owner?.fullName ?? "-",
        attentionReason: "No evidence recorded for mitigation actions.",
        actionLabel: "Open Risk Evidence",
        actionHref,
      });
    }

    if (
      lifecycle.stageKey === "RESIDUAL_ASSESSMENT" &&
      isWithinAttentionWindow(
        risk.targetResolutionDate,
        today,
        RISK_LIFECYCLE_ATTENTION_LOOKAHEAD_DAYS
      )
    ) {
      items.push({
        id: `risk-residual-assessment-${risk.id}`,
        category: "Risk",
        severity: "Medium",
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        title: risk.title,
        description:
          "All mitigation actions are closed. A residual risk assessment is required.",
        dueDate: dateOnly(risk.targetResolutionDate),
        owner: risk.owner?.fullName ?? "-",
        attentionReason: "Residual assessment pending.",
        actionLabel: "Open Risk Assessment",
        actionHref,
      });
    }

    if (
      lifecycle.needsManagementReview &&
      isWithinAttentionWindow(
        risk.targetResolutionDate,
        today,
        RISK_LIFECYCLE_ATTENTION_LOOKAHEAD_DAYS
      )
    ) {
      items.push({
        id: `risk-management-review-${risk.id}`,
        category: "Risk",
        severity: risk.exposure >= HIGH_RISK_EXPOSURE_THRESHOLD ? "High" : "Medium",
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        title: risk.title,
        description:
          "Residual assessment is recorded and the risk is pending management review.",
        dueDate: dateOnly(risk.targetResolutionDate),
        owner: risk.owner?.fullName ?? "-",
        attentionReason: "Management review pending.",
        actionLabel: "Open Management Review",
        actionHref,
      });
    }
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
