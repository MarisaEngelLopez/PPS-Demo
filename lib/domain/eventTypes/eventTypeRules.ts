export function normalizeEventTypeCode(value: FormDataEntryValue | null) {
  return String(value || "").trim().toUpperCase();
}

export function normalizeEventTypeText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export function normalizeEventTypeSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number(value || 100);
  return Number.isFinite(parsed) ? parsed : 100;
}
