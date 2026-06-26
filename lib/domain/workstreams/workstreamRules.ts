export function normalizeWorkstreamText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export function normalizeWorkstreamSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number(value || 100);
  return Number.isFinite(parsed) ? parsed : 100;
}
