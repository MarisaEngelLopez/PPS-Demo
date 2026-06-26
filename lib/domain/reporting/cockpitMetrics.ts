import type {
  ExecutiveReportDecision,
  ExecutiveReportEvent,
  ExecutiveReportRisk,
  ExecutiveReportWorkstream,
} from "@/lib/domain/reporting/executiveReportTypes";
import {
  getWorkstreamStatus,
  isActiveEvent,
  isActiveWorkstream,
  isWorkstreamOverdue,
} from "./executiveReportRules";
import {
  buildDecisionCockpitMetrics as buildStandardDecisionCockpitMetrics,
} from "@/lib/domain/decisions/decisionContract";
import {
  buildRiskCockpitMetrics as buildStandardRiskCockpitMetrics,
} from "@/lib/domain/risks/riskContract";
import type { DecisionMetrics } from "@/lib/domain/decisions/decisionTypes";
import type { RiskMetrics } from "@/lib/domain/risks/riskTypes";
import {
  getStatusCode,
  statusMatchesSemantic,
} from "@/lib/domain/reporting/statusUsageSemantics";

export type CockpitMetricGroup = "lifecycle" | "attention";

export type CockpitMetricTone =
  | "total"
  | "open"
  | "inProgress"
  | "onHold"
  | "completed"
  | "negative"
  | "due"
  | "overdue"
  | "escalated"
  | "critical";

export type CockpitMetric = {
  key: string;
  label: string;
  value: number | string;
  group: CockpitMetricGroup;
  tone: CockpitMetricTone;
  countsTowardTotal: boolean;
};

const lifecycleMetricOrder: Record<string, number> = {
  total: 0,
  open: 10,
  "in-progress": 20,
  "on-hold": 30,
  approved: 40,
  closed: 40,
  completed: 40,
};

const attentionMetricOrder: Record<string, number> = {
  "due-this-month": 10,
  overdue: 20,
  "overdue-actions": 20,
  escalated: 30,
  red: 40,
  critical: 40,
};

export function sortCockpitMetrics(metrics: CockpitMetric[]) {
  return [...metrics].sort((a, b) => {
    const order =
      a.group === "lifecycle" ? lifecycleMetricOrder : attentionMetricOrder;
    const otherOrder =
      b.group === "lifecycle" ? lifecycleMetricOrder : attentionMetricOrder;

    return (
      (order[a.key] ?? 100) -
        (otherOrder[b.key] ?? 100) ||
      a.label.localeCompare(b.label)
    );
  });
}

export const cockpitMetricToneColors: Record<
  CockpitMetricTone,
  { background: string; border: string; label: string; value: string }
> = {
  total: {
    background: "#f8fafc",
    border: "#e2e8f0",
    label: "#334155",
    value: "#0f172a",
  },
  open: {
    background: "#dbeafe",
    border: "#bfdbfe",
    label: "#1e3a8a",
    value: "#0f172a",
  },
  inProgress: {
    background: "#dbeafe",
    border: "#bfdbfe",
    label: "#334155",
    value: "#0f172a",
  },
  onHold: {
    background: "#fef3c7",
    border: "#fde68a",
    label: "#78350f",
    value: "#0f172a",
  },
  completed: {
    background: "#dcfce7",
    border: "#bbf7d0",
    label: "#166534",
    value: "#0f172a",
  },
  negative: {
    background: "#fee2e2",
    border: "#fecaca",
    label: "#991b1b",
    value: "#0f172a",
  },
  due: {
    background: "#dbeafe",
    border: "#bfdbfe",
    label: "#1e3a8a",
    value: "#0f172a",
  },
  overdue: {
    background: "#fde68a",
    border: "#facc15",
    label: "#854d0e",
    value: "#0f172a",
  },
  escalated: {
    background: "#fed7aa",
    border: "#fdba74",
    label: "#9a3412",
    value: "#0f172a",
  },
  critical: {
    background: "#fecaca",
    border: "#fca5a5",
    label: "#991b1b",
    value: "#0f172a",
  },
};

function governedStatusCode(item: {
  governedStatus?: { code?: string | null; name?: string | null } | null;
}) {
  return (
    item.governedStatus?.code?.toUpperCase() ??
    item.governedStatus?.name?.toUpperCase() ??
    ""
  );
}

function isExcludedFromReporting(status: string) {
  return status === "CANCELLED" || status === "REJECTED";
}

function metric(
  key: string,
  label: string,
  value: number | string,
  group: CockpitMetricGroup,
  tone: CockpitMetricTone,
  countsTowardTotal: boolean
): CockpitMetric {
  return { key, label, value, group, tone, countsTowardTotal };
}

export function buildDecisionCockpitMetrics({
  decisions,
  today = new Date(),
}: {
  decisions: ExecutiveReportDecision[];
  today?: Date;
}) {
  const reportingDecisions = decisions.filter(
    (decision) =>
      !statusMatchesSemantic(decision.statusRef, "DECISION", "isNegative", [
        "REJECTED",
        "CANCELLED",
      ]) && !isExcludedFromReporting(getStatusCode(decision.statusRef))
  );
  const activeDecisions = reportingDecisions.filter(
    (decision) =>
      statusMatchesSemantic(decision.statusRef, "DECISION", "isOpen", [
        "OPEN",
      ]) ||
      statusMatchesSemantic(decision.statusRef, "DECISION", "isInProgress", [
        "IN_PROGRESS",
        "ACTIVE",
      ]) ||
      statusMatchesSemantic(decision.statusRef, "DECISION", "isAttention", [
        "ATTENTION",
      ]) ||
      getStatusCode(decision.statusRef) === "ON_HOLD"
  );

  const metrics: DecisionMetrics = {
    total: reportingDecisions.length,
    open: reportingDecisions.filter((decision) =>
      statusMatchesSemantic(decision.statusRef, "DECISION", "isOpen", ["OPEN"])
    ).length,
    inProgress: activeDecisions.filter((decision) =>
      statusMatchesSemantic(decision.statusRef, "DECISION", "isInProgress", [
        "IN_PROGRESS",
        "ACTIVE",
      ])
    ).length,
    onHold: reportingDecisions.filter(
      (decision) => getStatusCode(decision.statusRef) === "ON_HOLD"
    ).length,
    attention: activeDecisions.filter((decision) =>
      statusMatchesSemantic(decision.statusRef, "DECISION", "isAttention", [
        "ATTENTION",
      ])
    ).length,
    approved: reportingDecisions.filter((decision) =>
      statusMatchesSemantic(decision.statusRef, "DECISION", "isPositive", [
        "APPROVED",
        "CLOSED",
        "CLOSE",
      ])
    ).length,
    rejected: decisions.filter((decision) =>
      statusMatchesSemantic(decision.statusRef, "DECISION", "isNegative", [
        "REJECTED",
        "CANCELLED",
      ])
    ).length,
    overdue: activeDecisions.filter((decision) => {
      if (!decision.dueDate) return false;
      const due = new Date(decision.dueDate);
      due.setHours(0, 0, 0, 0);
      const reference = new Date(today);
      reference.setHours(0, 0, 0, 0);
      return due < reference;
    }).length,
    escalated: activeDecisions.filter((decision) => decision.escalated).length,
    critical: activeDecisions.filter((decision) => decision.impact === "CRITICAL")
      .length,
  };

  return buildStandardDecisionCockpitMetrics(metrics);
}

export function buildRiskCockpitMetrics({
  risks,
  closedRisks,
  redRisks,
  escalatedRisks,
  dueThisMonthRisks,
  overdueRisks,
}: {
  risks: ExecutiveReportRisk[];
  closedRisks: ExecutiveReportRisk[];
  redRisks: ExecutiveReportRisk[];
  escalatedRisks: ExecutiveReportRisk[];
  dueThisMonthRisks: ExecutiveReportRisk[];
  overdueRisks: ExecutiveReportRisk[];
}) {
  const reportingRisks = risks.filter((risk) => {
    return (
      !statusMatchesSemantic(risk.status, "RISK", "isNegative", [
        "REJECTED",
        "CANCELLED",
      ]) && !isExcludedFromReporting(getStatusCode(risk.status))
    );
  });

  const metrics: RiskMetrics = {
    total: reportingRisks.length,
    open: reportingRisks.filter((risk) =>
      statusMatchesSemantic(risk.status, "RISK", "isOpen", ["OPEN"])
    ).length,
    inProgress: reportingRisks.filter((risk) =>
      statusMatchesSemantic(risk.status, "RISK", "isInProgress", [
        "IN_PROGRESS",
        "ACTIVE",
      ])
    ).length,
    onHold: reportingRisks.filter(
      (risk) => getStatusCode(risk.status) === "ON_HOLD"
    ).length,
    closed: closedRisks.length,
    red: redRisks.length,
    escalated: escalatedRisks.length,
    dueThisMonth: dueThisMonthRisks.length,
    overdue: overdueRisks.length,
  };

  return buildStandardRiskCockpitMetrics(metrics);
}

export function buildWorkstreamCockpitMetrics(
  workstreams: ExecutiveReportWorkstream[]
) {
  const reportingWorkstreams = workstreams.filter(
    (workstream) =>
      isActiveWorkstream(workstream) &&
      !isExcludedFromReporting(governedStatusCode(workstream))
  );
  const statuses = reportingWorkstreams.map(getWorkstreamStatus);

  return [
    metric(
      "total",
      "Total",
      reportingWorkstreams.length,
      "lifecycle",
      "total",
      false
    ),
    metric(
      "open",
      "Open",
      statuses.filter((status) => status === "Not Started").length,
      "lifecycle",
      "open",
      true
    ),
    metric(
      "in-progress",
      "In Progress",
      statuses.filter((status) => status === "In Progress").length,
      "lifecycle",
      "inProgress",
      true
    ),
    metric(
      "completed",
      "Completed",
      statuses.filter((status) => status === "Completed").length,
      "lifecycle",
      "completed",
      true
    ),
    metric(
      "overdue",
      "Overdue",
      reportingWorkstreams.filter((workstream) =>
        isWorkstreamOverdue(workstream)
      ).length,
      "attention",
      "overdue",
      false
    ),
  ];
}

export function buildMilestoneCockpitMetrics(events: ExecutiveReportEvent[]) {
  const reportingEvents = events.filter(isActiveEvent);
  const today = new Date();
  const openEvents = reportingEvents.filter((event) => !event.isCompleted);

  return [
    metric(
      "total",
      "Total",
      reportingEvents.length,
      "lifecycle",
      "total",
      false
    ),
    metric(
      "open",
      "Open",
      openEvents.length,
      "lifecycle",
      "open",
      true
    ),
    metric(
      "in-progress",
      "In Progress",
      "",
      "lifecycle",
      "inProgress",
      false
    ),
    metric(
      "completed",
      "Completed",
      reportingEvents.filter((event) => event.isCompleted).length,
      "lifecycle",
      "completed",
      true
    ),
    metric(
      "overdue",
      "Overdue",
      openEvents.filter(
        (event) => event.eventDate && new Date(event.eventDate) < today
      ).length,
      "attention",
      "overdue",
      false
    ),
  ];
}
