import {
  normalizeRiskText,
  parseRiskDate,
  parseRiskScore,
  textOrNull,
} from "./riskRules";
import type { RiskActionResult } from "./riskTypes";

export type ParsedRiskInput = {
  projectId: string;
  projectWorkstreamId: string | null;
  categoryId: string;
  statusId: string;
  ownerId: string | null;
  title: string;
  description: string | null;
  mitigationPlan: string | null;
  contingencyPlan: string | null;
  trigger: string | null;
  notes: string | null;
  probability: number;
  impact: number;
  targetResolutionDate: Date | null;
  escalated: boolean;
};

export type ParsedRiskActionInput = {
  projectRiskId: string;
  description: string;
  completionCriteria: string | null;
  ownerId: string | null;
  statusCode: string;
  dueDate: Date | null;
  evidence: string | null;
};

export type ParsedRiskActionEvidenceInput = {
  riskActionId: string;
  evidenceTypeId: string;
  title: string;
  description: string | null;
  documentReference: string | null;
  url: string | null;
  evidenceDate: Date | null;
  uploadedBy: string | null;
};

export type ParsedRiskAssessmentInput = {
  riskId: string;
  assessmentType: "INHERENT" | "RESIDUAL";
  probability: number;
  impact: number;
  comments: string | null;
  assessedByUserId: string | null;
  assessmentDate: Date | null;
};

export type ParsedRiskReviewInput = {
  riskId: string;
  residualAssessmentId: string | null;
  reviewTypeId: string;
  reviewOutcomeId: string;
  reviewedByUserId: string | null;
  reviewDate: Date | null;
  comments: string | null;
  linkedDecisionIds: string[];
};

export function riskOk(message: string): RiskActionResult {
  return { ok: true, message };
}

export function riskError(message: string): RiskActionResult {
  return { ok: false, message };
}

export function parseRiskInput(formData: FormData): ParsedRiskInput {
  const projectWorkstreamId = normalizeRiskText(
    formData.get("projectWorkstreamId")
  );
  const ownerId = normalizeRiskText(formData.get("ownerId"));

  return {
    projectId: normalizeRiskText(formData.get("projectId")),
    projectWorkstreamId: projectWorkstreamId || null,
    categoryId: normalizeRiskText(formData.get("categoryId")),
    statusId: normalizeRiskText(formData.get("statusId")),
    ownerId: ownerId || null,
    title: normalizeRiskText(formData.get("title")),
    description: textOrNull(formData.get("description")),
    mitigationPlan: textOrNull(formData.get("mitigationPlan")),
    contingencyPlan: textOrNull(formData.get("contingencyPlan")),
    trigger: textOrNull(formData.get("trigger")),
    notes: textOrNull(formData.get("notes")),
    probability: parseRiskScore(formData.get("probability")),
    impact: parseRiskScore(formData.get("impact")),
    targetResolutionDate: parseRiskDate(formData.get("targetResolutionDate")),
    escalated: normalizeRiskText(formData.get("escalated")) === "true",
  };
}

export function parseRiskActionInput(
  formData: FormData
): ParsedRiskActionInput {
  const ownerId = normalizeRiskText(formData.get("ownerId"));

  return {
    projectRiskId: normalizeRiskText(formData.get("projectRiskId")),
    description: normalizeRiskText(formData.get("description")),
    completionCriteria: textOrNull(formData.get("completionCriteria")),
    ownerId: ownerId || null,
    statusCode: normalizeRiskText(formData.get("status")).toUpperCase() || "OPEN",
    dueDate: parseRiskDate(formData.get("dueDate")),
    evidence: textOrNull(formData.get("evidence")),
  };
}

export function parseRiskActionEvidenceInput(
  formData: FormData
): ParsedRiskActionEvidenceInput {
  return {
    riskActionId: normalizeRiskText(formData.get("riskActionId")),
    evidenceTypeId: normalizeRiskText(formData.get("evidenceTypeId")),
    title: normalizeRiskText(formData.get("title")),
    description: textOrNull(formData.get("description")),
    documentReference: textOrNull(formData.get("documentReference")),
    url: textOrNull(formData.get("url")),
    evidenceDate: parseRiskDate(formData.get("evidenceDate")),
    uploadedBy: textOrNull(formData.get("uploadedBy")),
  };
}

export function parseRiskAssessmentInput(
  formData: FormData
): ParsedRiskAssessmentInput {
  const assessedByUserId = normalizeRiskText(formData.get("assessedByUserId"));
  const assessmentType = normalizeRiskText(formData.get("assessmentType"))
    .toUpperCase()
    .replace(/\s+/g, "_");

  return {
    riskId: normalizeRiskText(formData.get("riskId")),
    assessmentType:
      assessmentType === "RESIDUAL" || assessmentType === "INHERENT"
        ? assessmentType
        : "RESIDUAL",
    probability: parseRiskScore(formData.get("probability")),
    impact: parseRiskScore(formData.get("impact")),
    comments: textOrNull(formData.get("comments")),
    assessedByUserId: assessedByUserId || null,
    assessmentDate: parseRiskDate(formData.get("assessmentDate")),
  };
}

export function parseRiskReviewInput(formData: FormData): ParsedRiskReviewInput {
  const residualAssessmentId = normalizeRiskText(
    formData.get("residualAssessmentId")
  );
  const reviewedByUserId = normalizeRiskText(formData.get("reviewedByUserId"));
  const linkedDecisionValues = formData.getAll("linkedDecisionIds");

  return {
    riskId: normalizeRiskText(formData.get("riskId")),
    residualAssessmentId: residualAssessmentId || null,
    reviewTypeId: normalizeRiskText(formData.get("reviewTypeId")),
    reviewOutcomeId: normalizeRiskText(formData.get("reviewOutcomeId")),
    reviewedByUserId: reviewedByUserId || null,
    reviewDate: parseRiskDate(formData.get("reviewDate")),
    comments: textOrNull(formData.get("comments")),
    linkedDecisionIds: linkedDecisionValues
      .map((value) => normalizeRiskText(value))
      .filter(Boolean),
  };
}

export function validateRiskInput(input: ParsedRiskInput) {
  if (!input.projectId || !input.title || !input.categoryId || !input.statusId) {
    return riskError(
      "Risk not saved: project, title, category and status are required."
    );
  }

  return null;
}

export function validateRiskActionInput(input: ParsedRiskActionInput) {
  if (!input.projectRiskId || !input.description) {
    return riskError("Risk action not saved: risk and action are required.");
  }

  return null;
}

export function validateRiskActionEvidenceInput(
  input: ParsedRiskActionEvidenceInput
) {
  if (!input.riskActionId || !input.evidenceTypeId || !input.title) {
    return riskError(
      "Evidence not saved: action, evidence type and title are required."
    );
  }

  return null;
}

export function validateRiskAssessmentInput(input: ParsedRiskAssessmentInput) {
  if (!input.riskId || !input.assessmentDate) {
    return riskError("Assessment not saved: risk and date are required.");
  }

  return null;
}

export function validateRiskReviewInput(input: ParsedRiskReviewInput) {
  if (!input.riskId || !input.reviewTypeId || !input.reviewOutcomeId || !input.reviewDate) {
    return riskError(
      "Review not saved: risk, type, outcome and date are required."
    );
  }

  return null;
}
