export function normalizeProjectTemplateCode(value: FormDataEntryValue | null) {
  return String(value || "").trim().toUpperCase();
}

export function normalizeProjectTemplateText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export function normalizeTemplateNumber(
  value: FormDataEntryValue | null,
  fallback: number | null
) {
  const text = String(value || "").trim();
  if (!text) return fallback;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}
