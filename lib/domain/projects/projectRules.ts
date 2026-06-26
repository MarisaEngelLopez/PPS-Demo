import type { HealthStatus, ProjectCadence } from "@prisma/client";
import type { ProjectActionResult } from "./projectTypes";

const HEALTH_OPTIONS: HealthStatus[] = ["GREEN", "AMBER", "RED"];
const CADENCE_OPTIONS: ProjectCadence[] = ["WEEKLY", "MONTHLY"];

export function normalizeProjectText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export function projectTextOrNull(value: FormDataEntryValue | null) {
  const text = normalizeProjectText(value);
  return text || null;
}

export function projectDateOrNull(value: FormDataEntryValue | null) {
  const text = normalizeProjectText(value);
  return text ? new Date(text) : null;
}

export function normalizeProjectHealth(
  value: FormDataEntryValue | null
): HealthStatus {
  const health = normalizeProjectText(value).toUpperCase();
  return HEALTH_OPTIONS.includes(health as HealthStatus)
    ? (health as HealthStatus)
    : "GREEN";
}

export function normalizeProjectCadence(
  value: FormDataEntryValue | null
): ProjectCadence {
  const cadence = normalizeProjectText(value).toUpperCase();
  return CADENCE_OPTIONS.includes(cadence as ProjectCadence)
    ? (cadence as ProjectCadence)
    : "WEEKLY";
}

export function hasInvalidProjectDateRange(
  startDate: Date | null,
  endDate: Date | null
) {
  return Boolean(startDate && endDate && endDate < startDate);
}

export function projectOk(message: string): ProjectActionResult {
  return { ok: true, message };
}

export function projectError(message: string): ProjectActionResult {
  return { ok: false, message };
}
