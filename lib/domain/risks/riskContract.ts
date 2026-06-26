import type { CockpitMetric } from "@/lib/domain/reporting/cockpitMetrics";
import type { RiskMetrics } from "@/lib/domain/risks/riskTypes";
import { canDeleteRiskByLifecycle, isExactOpenStatus } from "@/lib/domain/risks/riskRules";

export const RISK_ENTITY = {
  route: "/risks",
  title: "Risks",
  createLabel: "New Risk",
  autoCodeLabel: "Auto",
  tableColumns: {
    project: "Project",
    code: "Code",
    workstream: "Workstream",
    title: "Risk",
    category: "Category",
    probability: "Prob",
    impact: "Impa",
    exposure: "Expo",
    status: "Status",
    owner: "Owner",
    target: "Target",
    escalated: "Esc.",
    action: "Action",
  },
  filters: {
    project: "Project",
    status: "Status",
    category: "Category",
    owner: "Owner",
    allProjects: "All projects",
    allStatuses: "All statuses",
    allCategories: "All categories",
    allOwners: "All owners",
    escalatedOnly: "Escalated only",
    redOnly: "Red only",
    openOnly: "Open only",
    apply: "Apply Filters",
    clear: "Clear",
  },
  fields: {
    description: "Description",
    trigger: "Trigger",
    created: "Created:",
    updated: "Last updated:",
    noWorkstream: " ",
    projectPlaceholder: "Project",
    titlePlaceholder: "Risk title",
    noOwner: "No owner",
  },
  actions: {
    save: "Save",
    cancel: "Cancel",
    details: "Details",
    hideDetails: "Hide Details",
    actions: "Actions",
    hideActions: "Hide Actions",
    assessments: "Assessments",
    hideAssessments: "Hide Assessments",
    reviews: "Reviews",
    hideReviews: "Hide Reviews",
    expandActions: "Expand All",
    collapseActions: "Collapse All",
    delete: "Delete",
  },
} as const;

export const RISK_ASSESSMENT_ENTITY = {
  title: "Risk Assessments",
  createLabel: "Add Assessment",
  emptyLabel: "No assessments yet.",
  defaultAssessmentType: "RESIDUAL",
  tableColumns: [
    "Type",
    "Probability",
    "Impact",
    "Exposure",
    "Assessed By",
    "Date",
    "Comments",
    "Action",
  ],
  fields: {
    noAssessor: "No assessor",
    commentsPlaceholder: "Assessment comments",
  },
  actions: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
  },
} as const;

export const RISK_ASSESSMENT_TYPE_OPTIONS = [
  { value: "INHERENT", label: "Inherent" },
  { value: "RESIDUAL", label: "Residual" },
] as const;

export const RISK_SCORE_OPTIONS = [
  { value: "1", label: "VLo" },
  { value: "2", label: "Low" },
  { value: "3", label: "Med" },
  { value: "4", label: "Hig" },
  { value: "5", label: "VHi" },
];

export const RISK_ACTION_ENTITY = {
  title: "Mitigation Actions",
  createLabel: "Add Action",
  emptyLabel: "No mitigation actions yet.",
  autoCodeLabel: "Auto",
  defaultStatusCode: "OPEN",
  tableColumns: [
    "Code",
    "Action",
    "Completion Criteria",
    "Owner",
    "Due Date",
    "Status",
    "Evidence / Comment",
    "Evidence",
    "Action",
  ],
  fields: {
    actionPlaceholder: "Mitigation action",
    completionCriteriaPlaceholder: "Completion criteria",
    evidencePlaceholder: "Evidence / comment",
    noOwner: "No owner",
  },
  actions: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    evidence: "Evidence",
    hideEvidence: "Hide Evidence",
  },
} as const;

export const RISK_ACTION_EVIDENCE_ENTITY = {
  title: "Evidence Records",
  createLabel: "Add Evidence",
  emptyLabel: "No structured evidence yet.",
  tableColumns: [
    "Type",
    "Title",
    "Date",
    "Reference",
    "URL",
    "Uploaded By",
    "Action",
  ],
  fields: {
    typePlaceholder: "Evidence type",
    titlePlaceholder: "Evidence title",
    referencePlaceholder: "Document reference",
    urlPlaceholder: "URL",
    uploadedByPlaceholder: "Uploaded by",
  },
  actions: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
  },
} as const;

export function buildRiskCockpitMetrics(metrics: RiskMetrics): CockpitMetric[] {
  return [
    {
      key: "total",
      label: "Total",
      value: metrics.total,
      group: "lifecycle",
      tone: "total",
      countsTowardTotal: false,
    },
    {
      key: "open",
      label: "Open",
      value: metrics.open,
      group: "lifecycle",
      tone: "open",
      countsTowardTotal: true,
    },
    {
      key: "in-progress",
      label: "In Progress",
      value: metrics.inProgress,
      group: "lifecycle",
      tone: "inProgress",
      countsTowardTotal: true,
    },
    {
      key: "on-hold",
      label: "On Hold",
      value: metrics.onHold,
      group: "lifecycle",
      tone: "onHold",
      countsTowardTotal: true,
    },
    {
      key: "closed",
      label: "Closed",
      value: metrics.closed,
      group: "lifecycle",
      tone: "completed",
      countsTowardTotal: true,
    },
    {
      key: "red",
      label: "Red",
      value: metrics.red,
      group: "attention",
      tone: "critical",
      countsTowardTotal: false,
    },
    {
      key: "escalated",
      label: "Escalated",
      value: metrics.escalated,
      group: "attention",
      tone: "escalated",
      countsTowardTotal: false,
    },
    {
      key: "due-this-month",
      label: "Due This Month",
      value: metrics.dueThisMonth,
      group: "attention",
      tone: "due",
      countsTowardTotal: false,
    },
    {
      key: "overdue",
      label: "Overdue",
      value: metrics.overdue,
      group: "attention",
      tone: "overdue",
      countsTowardTotal: false,
    },
  ];
}

export function getExposureStyle(exposure: number) {
  if (exposure >= 15) {
    return {
      background: "#fecaca",
      color: "#991b1b",
    };
  }

  if (exposure >= 7) {
    return {
      background: "#fed7aa",
      color: "#9a3412",
    };
  }

  return {
    background: "#bbf7d0",
    color: "#166534",
  };
}

export function canDeleteRiskByStatusCode(statusCode: string | null | undefined) {
  return isExactOpenStatus(statusCode);
}

export function canDeleteRiskByLifecycleFacts(facts: {
  statusCode: string | null | undefined;
  actionCount: number;
  assessmentCount: number;
  reviewCount: number;
}) {
  return canDeleteRiskByLifecycle(facts);
}

export function canDeleteRiskActionByStatusCode(
  statusCode: string | null | undefined
) {
  return isExactOpenStatus(statusCode);
}
