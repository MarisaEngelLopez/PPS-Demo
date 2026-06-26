import type { CockpitMetric } from "@/lib/domain/reporting/cockpitMetrics";
import type {
  DecisionMetrics,
  DecisionStatusOption,
} from "@/lib/domain/decisions/decisionTypes";

export const DECISION_ENTITY = {
  route: "/decisions",
  title: "Decisions",
  createLabel: "New Decision",
  emptyLabel: "No decisions found.",
  autoCodeLabel: "Auto code",
  tableColumns: [
    "Project",
    "Workstream",
    "Code",
    "Title",
    "Status",
    "Impact",
    "Owner",
    "Due",
    "Esc.",
    "Action",
  ],
  filters: {
    project: "Project",
    status: "Status",
    impact: "Impact",
    owner: "Owner",
    escalatedOnly: "Escalated only",
    overdueOnly: "Overdue only",
    openOnly: "Open only",
    apply: "Apply Filters",
    clear: "Clear",
    allProjects: "All projects",
    allStatuses: "All statuses",
    allImpacts: "All impacts",
    ownerPlaceholder: "Owner text",
  },
  fields: {
    requestedBy: "Requested By",
    decisionDate: "Decision Date",
    visibility: "Visibility",
    description: "Description",
    recommendation: "Recommendation",
    decision: "Decision",
    notes: "Notes",
  },
  actions: {
    save: "Save",
    cancel: "Cancel",
    details: "Details",
    hideDetails: "Hide Details",
    archive: "Archive",
    delete: "Delete",
  },
} as const;

export function buildDecisionCockpitMetrics(
  metrics?: DecisionMetrics | null
): CockpitMetric[] {
  return [
    {
      key: "total",
      label: "Total",
      value: metrics?.total ?? 0,
      group: "lifecycle",
      tone: "total",
      countsTowardTotal: false,
    },
    {
      key: "open",
      label: "Open",
      value: metrics?.open ?? 0,
      group: "lifecycle",
      tone: "open",
      countsTowardTotal: true,
    },
    {
      key: "in-progress",
      label: "In Progress",
      value: metrics?.inProgress ?? 0,
      group: "lifecycle",
      tone: "inProgress",
      countsTowardTotal: true,
    },
    {
      key: "on-hold",
      label: "On Hold",
      value: metrics?.onHold ?? 0,
      group: "lifecycle",
      tone: "onHold",
      countsTowardTotal: true,
    },
    {
      key: "approved",
      label: "Approved",
      value: metrics?.approved ?? 0,
      group: "lifecycle",
      tone: "completed",
      countsTowardTotal: true,
    },
    {
      key: "overdue",
      label: "Overdue",
      value: metrics?.overdue ?? 0,
      group: "attention",
      tone: "overdue",
      countsTowardTotal: false,
    },
    {
      key: "escalated",
      label: "Escalated",
      value: metrics?.escalated ?? 0,
      group: "attention",
      tone: "escalated",
      countsTowardTotal: false,
    },
    {
      key: "critical",
      label: "Critical",
      value: metrics?.critical ?? 0,
      group: "attention",
      tone: "critical",
      countsTowardTotal: false,
    },
  ];
}

export function getDefaultDecisionStatusCode(options: DecisionStatusOption[]) {
  return (
    options.find((option) => option.usage.isDefault)?.status.code ??
    options.find((option) => option.usage.isOpen)?.status.code ??
    options[0]?.status.code ??
    "OPEN"
  );
}

export function canDeleteDecisionByStatusCode(statusCode: string) {
  return statusCode === "OPEN";
}
