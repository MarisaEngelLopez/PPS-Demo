import type { ProjectVisibility } from "./projectExecutionTypes";

export const PROJECT_VISIBILITY_OPTIONS: ProjectVisibility[] = [
  "BOTH",
  "EXECUTIVE",
  "DETAILED",
  "HIDDEN",
];

export function normalizeProjectExecutionText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export function textOrNull(value: FormDataEntryValue | null) {
  const text = normalizeProjectExecutionText(value);
  return text || null;
}

export function numberOrNull(value: FormDataEntryValue | null) {
  const text = normalizeProjectExecutionText(value);
  if (!text) return null;

  const number = Number(text);
  return Number.isNaN(number) ? null : number;
}

export function parseDateOrNull(value: FormDataEntryValue | null) {
  const text = normalizeProjectExecutionText(value);
  return text ? new Date(text) : null;
}

export function normalizeProjectVisibility(value: FormDataEntryValue | null) {
  const visibility = normalizeProjectExecutionText(value).toUpperCase();
  return PROJECT_VISIBILITY_OPTIONS.includes(visibility as ProjectVisibility)
    ? (visibility as ProjectVisibility)
    : "BOTH";
}

export function hasInvalidDateRange(startDate: Date | null, endDate: Date | null) {
  return Boolean(startDate && endDate && endDate < startDate);
}

export function projectExecutionOk(message: string) {
  return { ok: true, message };
}

export function projectExecutionError(message: string) {
  return { ok: false, message };
}
