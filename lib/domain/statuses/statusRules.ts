import type { StatusReferenceCounts, StatusScopeCode } from "./statusTypes";

export const STATUS_SCOPE_CODES: StatusScopeCode[] = [
  "PROJECT",
  "DECISION",
  "RISK",
  "RISK_ACTION",
  "AGENT_INSTRUCTION",
  "AGENT_SUGGESTION",
  "AGENT_APPROVAL",
  "WORK_SESSION",
];

export function normalizeStatusCode(value: FormDataEntryValue | null) {
  return String(value || "").trim().toUpperCase();
}

export function normalizeStatusText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export function normalizeSortOrder(value: FormDataEntryValue | null, fallback = 100) {
  const parsed = Number(value || fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isChecked(formData: FormData, name: string) {
  return formData.getAll(name).includes("true");
}

export function hasAnyStatusReferences(counts: StatusReferenceCounts) {
  return Object.values(counts).some((count) => count > 0);
}

export function isStatusScopeCode(value: string): value is StatusScopeCode {
  return STATUS_SCOPE_CODES.includes(value as StatusScopeCode);
}
