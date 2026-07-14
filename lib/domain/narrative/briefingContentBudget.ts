import { getNarrativePresentationItems } from "@/lib/domain/reporting/narrativePresentation";
import type { ManagedNarrativeObjectKey } from "@/lib/domain/narrative/narrativeTypes";

const MAX_VISUAL_LINES: Partial<Record<ManagedNarrativeObjectKey, number>> = {
  "executive-summary": 5,
  "progress-since-last-report": 8,
  accomplishments: 8,
  "issues-concerns": 6,
  "next-steps": 7,
  "management-ask": 5,
  conclusion: 5,
};

function wrappedLines(value: string) {
  return Math.max(1, Math.ceil(value.trim().length / 34));
}

export function getBriefingContentBudget(
  content: string,
  objectKey: ManagedNarrativeObjectKey
) {
  const items = getNarrativePresentationItems(
    content,
    objectKey === "executive-summary" || objectKey === "conclusion"
      ? "CHECKPOINTS"
      : "BULLETS"
  );
  const visualLines = items.reduce(
    (total, item) =>
      total +
      wrappedLines(item.text) +
      item.children.reduce((childTotal, child) => childTotal + wrappedLines(child), 0),
    0
  );
  const maxVisualLines = MAX_VISUAL_LINES[objectKey] ?? 6;
  return {
    fits: visualLines <= maxVisualLines,
    visualLines,
    maxVisualLines,
    overflowLines: Math.max(0, visualLines - maxVisualLines),
  };
}
