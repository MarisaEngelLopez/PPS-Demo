import type {
  ManagedNarrativeAsset,
  ManagedNarrativeObjectKey,
  NarrativeAssetRequest,
  NarrativeLanguage,
  NarrativeLifecycleStatus,
  NarrativeVariant,
  ManagedNarrativeSummary,
  ManagedNarrativeRevisionSummary,
  NarrativeSourceType,
} from "@/lib/domain/narrative/narrativeTypes";

type ReportingPackNarrativeSource = {
  id: string;
  projectId: string;
  status: string;
  executiveSummary?: string | null;
  achievements?: string | null;
  issues?: string | null;
  nextSteps?: string | null;
  managementAsk?: string | null;
  conclusion?: string | null;
  updatedAt: Date;
};

type ReportingPackField =
  | "executiveSummary"
  | "achievements"
  | "issues"
  | "nextSteps"
  | "managementAsk"
  | "conclusion";

type ReportingPackNarrativeMapping = {
  objectKey: ManagedNarrativeObjectKey;
  variant: NarrativeVariant;
  field: ReportingPackField;
};

const REPORTING_PACK_NARRATIVE_MAPPINGS = [
  {
    objectKey: "executive-summary",
    variant: "DETAILED",
    field: "executiveSummary",
  },
  {
    objectKey: "accomplishments",
    variant: "DETAILED",
    field: "achievements",
  },
  {
    objectKey: "issues-concerns",
    variant: "DETAILED",
    field: "issues",
  },
  {
    objectKey: "next-steps",
    variant: "DETAILED",
    field: "nextSteps",
  },
  {
    objectKey: "management-ask",
    variant: "DETAILED",
    field: "managementAsk",
  },
  {
    objectKey: "conclusion",
    variant: "DETAILED",
    field: "conclusion",
  },
] satisfies ReportingPackNarrativeMapping[];

function normalizeLifecycleStatus(status: string): NarrativeLifecycleStatus {
  if (status === "APPROVED") return "APPROVED";
  if (status === "ARCHIVED") return "SUPERSEDED";
  return "PROPOSED";
}

function buildAssetId({
  reportingPackId,
  objectKey,
  variant,
  language,
}: {
  reportingPackId: string;
  objectKey: ManagedNarrativeObjectKey;
  variant: NarrativeVariant;
  language: NarrativeLanguage;
}) {
  return [reportingPackId, objectKey, variant, language].join(":");
}

export function buildManagedNarrativeAssetsFromReportingPack({
  reportingPack,
  language = "EN",
}: {
  reportingPack: ReportingPackNarrativeSource | null;
  language?: NarrativeLanguage;
}): ManagedNarrativeAsset[] {
  if (!reportingPack) return [];

  const status = normalizeLifecycleStatus(reportingPack.status);

  return REPORTING_PACK_NARRATIVE_MAPPINGS.flatMap((mapping) => {
    const content = reportingPack[mapping.field]?.trim();

    if (!content) return [];

    return {
      id: buildAssetId({
        reportingPackId: reportingPack.id,
        objectKey: mapping.objectKey,
        variant: mapping.variant,
        language,
      }),
      projectId: reportingPack.projectId,
      sourceReportingPackId: reportingPack.id,
      objectKey: mapping.objectKey,
      variant: mapping.variant,
      language,
      status,
      content,
      updatedAt: reportingPack.updatedAt,
    };
  });
}

type ManagedNarrativeRepositorySource = {
  id: string;
  projectId: string;
  objectKey: string;
  variant: string;
  language: string;
  revisions: Array<{
    id: string;
    sourceReportingPackId: string | null;
    status: string;
    content: string;
    documentJson?: string | null;
    evidenceJson?: string | null;
    presentationMode?: string;
    publishedAt?: Date | null;
    updatedAt: Date;
  }>;
};

export function buildManagedNarrativeAssetsFromRepository({
  narratives,
  sourceReportingPackId,
  language,
  includeDrafts = false,
}: {
  narratives: ManagedNarrativeRepositorySource[];
  sourceReportingPackId?: string | null;
  language: NarrativeLanguage;
  includeDrafts?: boolean;
}) {
  return narratives.flatMap((narrative) => {
    if (!OBJECT_KEYS.includes(narrative.objectKey as ManagedNarrativeObjectKey)) return [];
    if (narrative.variant !== "SHORT" && narrative.variant !== "DETAILED") return [];
    if (narrative.language !== language) return [];

    const selectedPackRevisions = narrative.revisions
      .filter(
        (item) =>
          item.sourceReportingPackId === sourceReportingPackId &&
          (item.status === "PROPOSED" || item.status === "APPROVED")
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const revision = includeDrafts
      ? selectedPackRevisions[0] ??
        narrative.revisions.find((item) => item.status === "APPROVED" && item.publishedAt)
      : narrative.revisions.find(
          (item) =>
            item.sourceReportingPackId === sourceReportingPackId &&
            item.status === "APPROVED" &&
            item.publishedAt
        ) ??
        narrative.revisions.find(
          (item) => item.status === "APPROVED" && item.publishedAt
        );
    if (!revision) return [];

    const presentationMode = ["AUTO", "CHECKPOINTS", "BULLETS", "PARAGRAPH"].includes(
      revision.presentationMode ?? "AUTO"
    )
      ? (revision.presentationMode as ManagedNarrativeAsset["presentationMode"])
      : "AUTO";
    return [{
      id: narrative.id,
      projectId: narrative.projectId,
      sourceReportingPackId: revision.sourceReportingPackId,
      objectKey: narrative.objectKey as ManagedNarrativeObjectKey,
      variant: narrative.variant as NarrativeVariant,
      language,
      status: revision.status === "PROPOSED" ? "PROPOSED" as const : "APPROVED" as const,
      content: revision.content,
      documentJson: revision.documentJson,
      evidenceJson: revision.evidenceJson,
      presentationMode,
      updatedAt: revision.updatedAt,
    }];
  });
}

export function findManagedNarrativeAsset(
  assets: ManagedNarrativeAsset[],
  request: NarrativeAssetRequest
) {
  return assets.find(
    (asset) =>
      asset.objectKey === request.objectKey &&
      asset.variant === request.variant
  );
}

export function getManagedNarrativeAssetText(
  assets: ManagedNarrativeAsset[],
  request: NarrativeAssetRequest
) {
  return findManagedNarrativeAsset(assets, request)?.content ?? null;
}

type StoredNarrativeSummary = {
  id: string;
  objectKey: string;
  variant: string;
  language: string;
  revisions: Array<{
    id: string;
    revisionNumber: number;
    status: string;
    content: string;
    sourceType: string;
    documentJson?: string | null;
    evidenceJson?: string | null;
    presentationMode?: string;
    sourceReportingPackId: string | null;
    approvedAt: Date | null;
    publishedAt?: Date | null;
    createdAt: Date;
  }>;
};

const OBJECT_KEYS: ManagedNarrativeObjectKey[] = [
  "executive-summary",
  "progress-since-last-report",
  "accomplishments",
  "issues-concerns",
  "next-steps",
  "management-ask",
  "conclusion",
];

export function toManagedNarrativeSummary(
  stored: StoredNarrativeSummary
): ManagedNarrativeSummary | null {
  if (!OBJECT_KEYS.includes(stored.objectKey as ManagedNarrativeObjectKey)) return null;
  if (stored.variant !== "SHORT" && stored.variant !== "DETAILED") return null;
  if (stored.language !== "EN" && stored.language !== "ES") return null;

  return {
    id: stored.id,
    objectKey: stored.objectKey as ManagedNarrativeObjectKey,
    variant: stored.variant,
    language: stored.language,
    revisions: stored.revisions.flatMap((revision) => {
      if (!["PROPOSED", "APPROVED", "SUPERSEDED", "REJECTED"].includes(revision.status)) return [];
      if (!["MANUAL", "GENERATED", "COPIED"].includes(revision.sourceType)) return [];
      const presentationMode = ["AUTO", "CHECKPOINTS", "BULLETS", "PARAGRAPH"].includes(
        revision.presentationMode ?? "AUTO"
      )
        ? (revision.presentationMode as ManagedNarrativeRevisionSummary["presentationMode"])
        : "AUTO";
      return [{
        ...revision,
        status: revision.status as NarrativeLifecycleStatus,
        sourceType: revision.sourceType as NarrativeSourceType,
        presentationMode,
      }];
    }),
  };
}
