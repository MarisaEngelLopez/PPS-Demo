export const RISK_LIFECYCLE_STAGES = [
  {
    key: "COMMITTEE_REVIEW",
    label: "Committee Review",
    priority: 10,
  },
  {
    key: "RESIDUAL_ASSESSMENT",
    label: "Residual Assessment",
    priority: 20,
  },
  {
    key: "MITIGATION_EXECUTION",
    label: "Mitigation Execution",
    priority: 30,
  },
  {
    key: "MITIGATION_PLANNING",
    label: "Mitigation Planning",
    priority: 40,
  },
  {
    key: "IDENTIFIED",
    label: "Identified",
    priority: 50,
  },
  {
    key: "CLOSED",
    label: "Closed",
    priority: 90,
  },
] as const;

export type RiskLifecycleStageKey =
  (typeof RISK_LIFECYCLE_STAGES)[number]["key"];

export type RiskLifecycleInput = {
  createdAt: Date | string;
  status?: { code?: string | null } | null;
  riskActions?: {
    statusRef?: { code?: string | null } | null;
    evidenceRecords?: unknown[];
  }[];
  assessments?: {
    assessmentType: "INHERENT" | "RESIDUAL";
    exposure: number;
    assessmentDate: Date | string;
  }[];
  reviews?: {
    reviewDate: Date | string;
    reviewOutcome?: {
      name?: string | null;
      isClosed?: boolean;
      isPending?: boolean;
    } | null;
  }[];
};

export type RiskLifecycleConfig = {
  closedRiskStatusCodes: string[];
  openRiskActionStatusCodes: string[];
  closedRiskActionStatusCodes: string[];
};

export type RiskLifecycleSummary = {
  stageKey: RiskLifecycleStageKey;
  stageLabel: string;
  stagePriority: number;
  needsManagementReview: boolean;
  isClosed: boolean;
  actionTotal: number;
  actionClosed: number;
  evidenceCount: number;
  residualExposure: number | null;
  latestReviewOutcome: string | null;
  sortDate: Date;
};

export function deriveRiskLifecycleSummary(
  risk: RiskLifecycleInput,
  config: RiskLifecycleConfig
): RiskLifecycleSummary {
  const stageByKey = Object.fromEntries(
    RISK_LIFECYCLE_STAGES.map((stage) => [stage.key, stage])
  ) as Record<
    RiskLifecycleStageKey,
    (typeof RISK_LIFECYCLE_STAGES)[number]
  >;

  const actionTotal = risk.riskActions?.length ?? 0;
  const closedActionCodes = new Set(config.closedRiskActionStatusCodes);
  const openActionCodes = new Set(config.openRiskActionStatusCodes);
  const closedRiskCodes = new Set(config.closedRiskStatusCodes);
  const actionClosed =
    risk.riskActions?.filter((action) =>
      closedActionCodes.has(action.statusRef?.code ?? "")
    ).length ?? 0;
  const actionOpen =
    risk.riskActions?.filter((action) =>
      openActionCodes.has(action.statusRef?.code ?? "")
    ).length ?? 0;
  const evidenceCount =
    risk.riskActions?.reduce(
      (count, action) => count + (action.evidenceRecords?.length ?? 0),
      0
    ) ?? 0;
  const residualAssessments =
    risk.assessments?.filter(
      (assessment) => assessment.assessmentType === "RESIDUAL"
    ) ?? [];
  const latestResidualAssessment = residualAssessments
    .slice()
    .sort(
      (a, b) =>
        new Date(b.assessmentDate).getTime() -
        new Date(a.assessmentDate).getTime()
    )[0];
  const latestReview = (risk.reviews ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()
    )[0];
  const hasClosedReview = (risk.reviews ?? []).some(
    (review) => review.reviewOutcome?.isClosed
  );
  const isClosed =
    closedRiskCodes.has(risk.status?.code ?? "") || hasClosedReview;

  let stageKey: RiskLifecycleStageKey = "IDENTIFIED";

  if (isClosed) {
    stageKey = "CLOSED";
  } else if (latestResidualAssessment && !hasClosedReview) {
    stageKey = "COMMITTEE_REVIEW";
  } else if (actionTotal > 0 && actionClosed === actionTotal) {
    stageKey = "RESIDUAL_ASSESSMENT";
  } else if (actionTotal > 0 && actionOpen === actionTotal) {
    stageKey = "MITIGATION_PLANNING";
  } else if (actionTotal > 0 && actionClosed < actionTotal) {
    stageKey = "MITIGATION_EXECUTION";
  } else if (actionTotal === 0) {
    stageKey = "IDENTIFIED";
  }

  const stage = stageByKey[stageKey];

  return {
    stageKey,
    stageLabel: stage.label,
    stagePriority: stage.priority,
    needsManagementReview: stageKey === "COMMITTEE_REVIEW",
    isClosed,
    actionTotal,
    actionClosed,
    evidenceCount,
    residualExposure: latestResidualAssessment?.exposure ?? null,
    latestReviewOutcome: latestReview?.reviewOutcome?.name ?? null,
    sortDate: new Date(risk.createdAt),
  };
}

export function sortRiskLifecycleSummaries<
  T extends { lifecycle: RiskLifecycleSummary }
>(rows: T[]) {
  return rows.slice().sort((a, b) => {
    if (a.lifecycle.stagePriority !== b.lifecycle.stagePriority) {
      return a.lifecycle.stagePriority - b.lifecycle.stagePriority;
    }

    const aTime = a.lifecycle.sortDate.getTime();
    const bTime = b.lifecycle.sortDate.getTime();

    if (a.lifecycle.isClosed && b.lifecycle.isClosed) {
      return bTime - aTime;
    }

    return aTime - bTime;
  });
}
