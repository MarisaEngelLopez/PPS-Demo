import { Prisma, type LanguageCode } from "@prisma/client";
import type {
  ManagedNarrativeObjectKey,
  NarrativeEvidenceSnapshot,
  NarrativePresentationPreference,
  NarrativeSourceType,
  NarrativeVariant,
} from "@/lib/domain/narrative/narrativeTypes";
import {
  parseNarrativeDocument,
  resolveNarrativePresentationMode,
  serializeNarrativeDocument,
} from "@/lib/domain/narrative/narrativeDocument";
import { getBriefingContentBudget } from "@/lib/domain/narrative/briefingContentBudget";

type NarrativeField =
  | "executiveSummary"
  | "achievements"
  | "issues"
  | "nextSteps"
  | "managementAsk"
  | "conclusion";

type NarrativeInput = Record<NarrativeField, string | null>;

export const REPORTING_PACK_NARRATIVE_FIELDS = [
  { field: "executiveSummary", objectKey: "executive-summary" },
  { field: "achievements", objectKey: "accomplishments" },
  { field: "issues", objectKey: "issues-concerns" },
  { field: "nextSteps", objectKey: "next-steps" },
  { field: "managementAsk", objectKey: "management-ask" },
  { field: "conclusion", objectKey: "conclusion" },
] satisfies Array<{
  field: NarrativeField;
  objectKey: ManagedNarrativeObjectKey;
}>;

type NarrativeTransaction = Prisma.TransactionClient;

export async function createNarrativeProposals({
  tx,
  projectId,
  sourceReportingPackId,
  language,
  narrative,
  sourceType = "MANUAL",
  variant = "DETAILED",
  evidenceSnapshot,
  presentationPreferences = {},
}: {
  tx: NarrativeTransaction;
  projectId: string;
  sourceReportingPackId: string;
  language: LanguageCode;
  narrative: NarrativeInput;
  sourceType?: NarrativeSourceType;
  variant?: NarrativeVariant;
  evidenceSnapshot?: NarrativeEvidenceSnapshot;
  presentationPreferences?: Partial<
    Record<ManagedNarrativeObjectKey, NarrativePresentationPreference>
  >;
}) {
  let created = 0;

  for (const mapping of REPORTING_PACK_NARRATIVE_FIELDS) {
    const content = narrative[mapping.field]?.trim();
    if (!content) continue;

    const objectKey: ManagedNarrativeObjectKey =
      variant === "SHORT" && mapping.field === "achievements"
        ? "progress-since-last-report"
        : mapping.objectKey;
    const asset = await tx.managedNarrative.upsert({
      where: {
        projectId_objectKey_variant_language: {
          projectId,
          objectKey,
          variant,
          language,
        },
      },
      create: { projectId, objectKey, variant, language },
      update: {},
      include: {
        revisions: {
          where: { status: { in: ["PROPOSED", "APPROVED"] } },
          orderBy: { revisionNumber: "desc" },
        },
      },
    });

    if (
      asset.revisions.some(
        (revision) =>
          revision.content === content &&
          (revision.status === "APPROVED" ||
            revision.sourceReportingPackId === sourceReportingPackId)
      )
    ) {
      continue;
    }

    const latestRevision = await tx.managedNarrativeRevision.findFirst({
      where: { narrativeId: asset.id },
      orderBy: { revisionNumber: "desc" },
      select: { revisionNumber: true },
    });

    await tx.managedNarrativeRevision.updateMany({
      where: { narrativeId: asset.id, status: "PROPOSED" },
      data: { status: "SUPERSEDED" },
    });

    await tx.managedNarrativeRevision.create({
      data: {
        narrativeId: asset.id,
        sourceReportingPackId,
        revisionNumber: (latestRevision?.revisionNumber ?? 0) + 1,
        status: "PROPOSED",
        content,
        documentJson: serializeNarrativeDocument(
          parseNarrativeDocument(
            content,
            resolveNarrativePresentationMode({
              preference: presentationPreferences[objectKey],
              objectKey,
            })
          )
        ),
        evidenceJson: evidenceSnapshot
          ? JSON.stringify(evidenceSnapshot)
          : null,
        presentationMode:
          presentationPreferences[objectKey] ?? "AUTO",
        sourceType,
      },
    });
    created += 1;
  }

  return created;
}

export async function approveNarrativeRevision({
  tx,
  revisionId,
  projectId,
}: {
  tx: NarrativeTransaction;
  revisionId: string;
  projectId: string;
}) {
  const revision = await tx.managedNarrativeRevision.findFirst({
    where: { id: revisionId, status: "PROPOSED", narrative: { projectId } },
    include: { narrative: { select: { objectKey: true, variant: true } } },
  });
  if (!revision) return false;
  if (
    revision.narrative.variant === "SHORT" &&
    !getBriefingContentBudget(
      revision.content,
      revision.narrative.objectKey as ManagedNarrativeObjectKey
    ).fits
  ) {
    return false;
  }

  await tx.managedNarrativeRevision.updateMany({
    where: { narrativeId: revision.narrativeId, status: "APPROVED" },
    data: { status: "SUPERSEDED" },
  });
  await tx.managedNarrativeRevision.update({
    where: { id: revision.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  return true;
}

export async function rejectNarrativeRevision({
  tx,
  revisionId,
  projectId,
}: {
  tx: NarrativeTransaction;
  revisionId: string;
  projectId: string;
}) {
  const result = await tx.managedNarrativeRevision.updateMany({
    where: { id: revisionId, status: "PROPOSED", narrative: { projectId } },
    data: { status: "REJECTED" },
  });
  return result.count > 0;
}
