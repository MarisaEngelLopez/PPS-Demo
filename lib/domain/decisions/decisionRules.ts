import type { DecisionImpact, DecisionVisibility } from "./decisionTypes";

export const DECISION_IMPACT_OPTIONS: DecisionImpact[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

export const DECISION_VISIBILITY_OPTIONS: DecisionVisibility[] = [
  "EXECUTIVE",
  "BOTH",
  "DETAILED",
  "HIDDEN",
];

export function normalizeDecisionText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export function textOrNull(value: FormDataEntryValue | null) {
  const text = normalizeDecisionText(value);
  return text || null;
}

export function parseDecisionDate(value: FormDataEntryValue | null) {
  const text = normalizeDecisionText(value);
  return text ? new Date(text) : null;
}

export function normalizeDecisionImpact(value: FormDataEntryValue | null) {
  const impact = normalizeDecisionText(value).toUpperCase();
  return DECISION_IMPACT_OPTIONS.includes(impact as DecisionImpact)
    ? (impact as DecisionImpact)
    : "MEDIUM";
}

export function normalizeDecisionVisibility(value: FormDataEntryValue | null) {
  const visibility = normalizeDecisionText(value).toUpperCase();
  return DECISION_VISIBILITY_OPTIONS.includes(visibility as DecisionVisibility)
    ? (visibility as DecisionVisibility)
    : "EXECUTIVE";
}

export function getDecisionStatusCode(decision: {
  status?: string | null;
  statusRef?: { code?: string | null } | null;
}) {
  return decision.statusRef?.code ?? "";
}
