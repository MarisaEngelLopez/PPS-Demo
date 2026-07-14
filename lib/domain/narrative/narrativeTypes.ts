export type NarrativeLanguage = "EN" | "ES";

export type ManagedNarrativeObjectKey =
  | "executive-summary"
  | "progress-since-last-report"
  | "accomplishments"
  | "issues-concerns"
  | "next-steps"
  | "management-ask"
  | "conclusion";

export type NarrativeVariant = "SHORT" | "DETAILED";

export type NarrativeLifecycleStatus =
  | "PROPOSED"
  | "APPROVED"
  | "SUPERSEDED"
  | "REJECTED";

export type NarrativeSourceType = "MANUAL" | "GENERATED" | "COPIED";

export type NarrativePresentationPreference =
  | "AUTO"
  | "CHECKPOINTS"
  | "BULLETS"
  | "PARAGRAPH";

export type NarrativeDocumentItem = {
  text: string;
  children: string[];
};

export type NarrativeDocument = {
  version: 1;
  items: NarrativeDocumentItem[];
};

export type NarrativeEvidenceSnapshot = {
  comparisonDate: string;
  reportingDate: string;
  timeEntryIds: string[];
  workstreamIds: string[];
  eventIds: string[];
  riskIds: string[];
  decisionIds: string[];
};

export type NarrativePresentationContext =
  | "EXECUTIVE_REPORT"
  | "EXECUTIVE_BRIEFING";

export type ManagedNarrativeAsset = {
  id: string;
  projectId: string;
  sourceReportingPackId: string | null;
  objectKey: ManagedNarrativeObjectKey;
  variant: NarrativeVariant;
  language: NarrativeLanguage;
  status: NarrativeLifecycleStatus;
  content: string;
  documentJson?: string | null;
  evidenceJson?: string | null;
  presentationMode?: NarrativePresentationPreference;
  updatedAt: Date;
};

export type ManagedNarrativeRevisionSummary = {
  id: string;
  revisionNumber: number;
  status: NarrativeLifecycleStatus;
  content: string;
  sourceType: NarrativeSourceType;
  documentJson?: string | null;
  evidenceJson?: string | null;
  presentationMode?: NarrativePresentationPreference;
  sourceReportingPackId: string | null;
  approvedAt: Date | string | null;
  publishedAt?: Date | string | null;
  createdAt: Date | string;
};

export type ManagedNarrativeSummary = {
  id: string;
  objectKey: ManagedNarrativeObjectKey;
  variant: NarrativeVariant;
  language: NarrativeLanguage;
  revisions: ManagedNarrativeRevisionSummary[];
};

export type NarrativeAssetRequest = {
  objectKey: ManagedNarrativeObjectKey;
  variant: NarrativeVariant;
};
