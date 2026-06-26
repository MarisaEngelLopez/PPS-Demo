export function normalizeTaskFamilyCode(value: FormDataEntryValue | null) {
  return String(value || "").trim().toUpperCase();
}

export function normalizeTaskFamilyText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export function normalizeTaskFamilySortOrder(value: FormDataEntryValue | null) {
  const parsed = Number(value || 100);
  return Number.isFinite(parsed) ? parsed : 100;
}
