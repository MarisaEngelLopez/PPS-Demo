import type {
  ManagedNarrativeObjectKey,
  NarrativeAssetRequest,
  NarrativePresentationContext,
  NarrativeVariant,
} from "@/lib/domain/narrative/narrativeTypes";

export type NarrativeCatalogItem = {
  objectKey: ManagedNarrativeObjectKey;
  variant: NarrativeVariant;
  label: string;
};

export const EXECUTIVE_REPORT_NARRATIVE_CATALOG = [
  {
    objectKey: "executive-summary",
    variant: "DETAILED",
    label: "Executive Summary",
  },
  {
    objectKey: "accomplishments",
    variant: "DETAILED",
    label: "Accomplishments",
  },
  {
    objectKey: "issues-concerns",
    variant: "DETAILED",
    label: "Issues / Concerns",
  },
  {
    objectKey: "next-steps",
    variant: "DETAILED",
    label: "Next Steps",
  },
  {
    objectKey: "management-ask",
    variant: "DETAILED",
    label: "Management Ask",
  },
  {
    objectKey: "conclusion",
    variant: "DETAILED",
    label: "Conclusion",
  },
] satisfies NarrativeCatalogItem[];

export const EXECUTIVE_BRIEFING_NARRATIVE_CATALOG = [
  {
    objectKey: "executive-summary",
    variant: "SHORT",
    label: "Executive Summary",
  },
  {
    objectKey: "progress-since-last-report",
    variant: "SHORT",
    label: "Progress Since Last Report",
  },
  {
    objectKey: "issues-concerns",
    variant: "SHORT",
    label: "Issues / Concerns",
  },
  {
    objectKey: "next-steps",
    variant: "SHORT",
    label: "Next Steps",
  },
  {
    objectKey: "management-ask",
    variant: "SHORT",
    label: "Management Ask",
  },
  {
    objectKey: "conclusion",
    variant: "SHORT",
    label: "Conclusion",
  },
] satisfies NarrativeCatalogItem[];

export function getNarrativeCatalog(
  context: NarrativePresentationContext
): NarrativeCatalogItem[] {
  return context === "EXECUTIVE_REPORT"
    ? EXECUTIVE_REPORT_NARRATIVE_CATALOG
    : EXECUTIVE_BRIEFING_NARRATIVE_CATALOG;
}

export function getNarrativeAssetRequests(
  context: NarrativePresentationContext
): NarrativeAssetRequest[] {
  return getNarrativeCatalog(context).map(({ objectKey, variant }) => ({
    objectKey,
    variant,
  }));
}
