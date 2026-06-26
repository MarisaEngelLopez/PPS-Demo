export function normalizeRiskReviewConfigCode(value: FormDataEntryValue | null) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeRiskReviewConfigText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export function normalizeRiskReviewConfigSortOrder(
  value: FormDataEntryValue | null
) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 100;
}

export function boolInput(value: FormDataEntryValue | null) {
  return String(value || "") === "true";
}
