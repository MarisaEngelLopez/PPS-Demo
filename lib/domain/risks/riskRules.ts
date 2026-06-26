export function normalizeRiskText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export function textOrNull(value: FormDataEntryValue | null) {
  const text = normalizeRiskText(value);
  return text || null;
}

export function parseRiskDate(value: FormDataEntryValue | null) {
  const text = normalizeRiskText(value);
  return text ? new Date(text) : null;
}

export function parseRiskScore(value: FormDataEntryValue | null, fallback = 3) {
  const score = Number(value || fallback);
  return Number.isFinite(score) ? Math.min(5, Math.max(1, score)) : fallback;
}

export function getRiskActionStatusCode(action: {
  status?: string | null;
  statusRef?: { code?: string | null } | null;
}) {
  return action.statusRef?.code ?? "";
}

export function isExactOpenStatus(statusCode: string | null | undefined) {
  return statusCode === "OPEN";
}

export type RiskClosureFacts = {
  actionCount: number;
  openActionCount: number;
  hasResidualAssessment: boolean;
  hasClosedReviewOutcome: boolean;
};

export function getRiskClosureBlockers(facts: RiskClosureFacts) {
  const blockers: string[] = [];

  if (facts.openActionCount > 0) {
    blockers.push("all mitigation actions must be completed or closed");
  }

  if (!facts.hasResidualAssessment) {
    blockers.push("a residual assessment is required");
  }

  if (!facts.hasClosedReviewOutcome) {
    blockers.push("a committee / management review with a closed outcome is required");
  }

  return blockers;
}

export function canDeleteRiskByLifecycle(facts: {
  statusCode: string | null | undefined;
  actionCount: number;
  assessmentCount: number;
  reviewCount: number;
}) {
  return (
    isExactOpenStatus(facts.statusCode) &&
    facts.actionCount === 0 &&
    facts.assessmentCount === 0 &&
    facts.reviewCount === 0
  );
}
