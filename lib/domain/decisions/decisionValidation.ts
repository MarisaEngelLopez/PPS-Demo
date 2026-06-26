import {
  normalizeDecisionImpact,
  normalizeDecisionText,
  normalizeDecisionVisibility,
  parseDecisionDate,
  textOrNull,
} from "./decisionRules";
import type { DecisionActionResult } from "./decisionTypes";

export type ParsedDecisionInput = {
  projectId: string;
  projectWorkstreamId: string | null;
  decisionCode: string | null;
  title: string;
  description: string | null;
  recommendation: string | null;
  decision: string | null;
  requestedBy: string | null;
  owner: string | null;
  decisionDate: Date | null;
  dueDate: Date | null;
  statusCode: string;
  impact: string;
  visibility: string;
  escalated: boolean;
  notes: string | null;
};

export function decisionOk(message: string): DecisionActionResult {
  return { ok: true, message };
}

export function decisionError(message: string): DecisionActionResult {
  return { ok: false, message };
}

export function parseDecisionInput(formData: FormData): ParsedDecisionInput {
  const projectWorkstreamId = normalizeDecisionText(
    formData.get("projectWorkstreamId")
  );

  return {
    projectId: normalizeDecisionText(formData.get("projectId")),
    projectWorkstreamId: projectWorkstreamId || null,
    decisionCode: textOrNull(formData.get("decisionCode")),
    title: normalizeDecisionText(formData.get("title")),
    description: textOrNull(formData.get("description")),
    recommendation: textOrNull(formData.get("recommendation")),
    decision: textOrNull(formData.get("decision")),
    requestedBy: textOrNull(formData.get("requestedBy")),
    owner: textOrNull(formData.get("owner")),
    decisionDate: parseDecisionDate(formData.get("decisionDate")),
    dueDate: parseDecisionDate(formData.get("dueDate")),
    statusCode: normalizeDecisionText(formData.get("status")).toUpperCase() || "OPEN",
    impact: normalizeDecisionImpact(formData.get("impact")),
    visibility: normalizeDecisionVisibility(formData.get("visibility")),
    escalated: normalizeDecisionText(formData.get("escalated")) === "true",
    notes: textOrNull(formData.get("notes")),
  };
}

export function validateDecisionInput(input: ParsedDecisionInput) {
  if (!input.projectId || !input.title) {
    return decisionError("Decision not saved: project and title are required.");
  }

  return null;
}
