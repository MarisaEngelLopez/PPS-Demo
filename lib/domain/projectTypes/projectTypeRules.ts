export function normalizeProjectTypeCode(value: FormDataEntryValue | null) {
  return String(value || "").trim().toUpperCase();
}

export function normalizeProjectTypeText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export function normalizeProjectTypeSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number(value || 100);
  return Number.isFinite(parsed) ? parsed : 100;
}
