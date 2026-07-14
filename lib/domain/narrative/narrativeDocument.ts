import type {
  NarrativeDocument,
  NarrativePresentationPreference,
} from "@/lib/domain/narrative/narrativeTypes";
import {
  getNarrativePresentationItems,
  type NarrativePresentationMode,
} from "@/lib/domain/reporting/narrativePresentation";

export function resolveNarrativePresentationMode({
  preference,
  objectKey,
}: {
  preference?: NarrativePresentationPreference | null;
  objectKey: string;
}): NarrativePresentationMode {
  if (preference === "CHECKPOINTS" || preference === "BULLETS") return preference;
  return objectKey === "executive-summary" || objectKey === "conclusion"
    ? "CHECKPOINTS"
    : "BULLETS";
}

export function parseNarrativeDocument(
  content: string,
  mode: NarrativePresentationMode
): NarrativeDocument {
  return { version: 1, items: getNarrativePresentationItems(content, mode) };
}

export function readNarrativeDocument(
  documentJson: string | null | undefined,
  fallbackContent: string,
  mode: NarrativePresentationMode
) {
  if (documentJson) {
    try {
      const parsed = JSON.parse(documentJson) as NarrativeDocument;
      if (parsed.version === 1 && Array.isArray(parsed.items)) return parsed;
    } catch {
      // Fall back to the editable shorthand if stored structure is malformed.
    }
  }
  return parseNarrativeDocument(fallbackContent, mode);
}

export function serializeNarrativeDocument(document: NarrativeDocument) {
  return JSON.stringify(document);
}
