export function normalizePhaseText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export function normalizePhaseSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number(value || 100);
  return Number.isFinite(parsed) ? parsed : 100;
}
