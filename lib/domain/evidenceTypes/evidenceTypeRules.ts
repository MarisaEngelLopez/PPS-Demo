export function normalizeEvidenceTypeCode(value: FormDataEntryValue | null) {
  return String(value || "").trim().toUpperCase();
}

export function normalizeEvidenceTypeText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export function normalizeEvidenceTypeSortOrder(
  value: FormDataEntryValue | null
) {
  const parsed = Number(value || 100);
  return Number.isFinite(parsed) ? parsed : 100;
}
