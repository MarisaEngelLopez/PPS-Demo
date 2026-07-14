"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_REPORT_INDEX,
  canDeleteReportingPack,
  getNextDraftTitle,
  getNextReportingPackVersion,
  getNextDraftShellData,
  isReportingPackLocked,
} from "@/lib/domain/reporting/reportingPackRules";
import {
  getLatestNextDraftSourcePack,
  getLatestReportingPack,
  getReportingPackStatus,
} from "@/lib/domain/reporting/reportingPackQueries";
import {
  parseReportingPackInput,
  validateReportingPackInput,
} from "@/lib/domain/reporting/reportingPackValidation";
import {
  approveNarrativeRevision,
  createNarrativeProposals,
  rejectNarrativeRevision,
} from "@/lib/domain/narrative/narrativeLifecycle";
import {
  generateReportingPackNarrative,
  generateShortReportingPackNarrative,
} from "@/lib/domain/narrative/narrativeGenerator";
import type {
  ManagedNarrativeObjectKey,
  NarrativePresentationPreference,
} from "@/lib/domain/narrative/narrativeTypes";
import {
  parseNarrativeDocument,
  resolveNarrativePresentationMode,
  serializeNarrativeDocument,
} from "@/lib/domain/narrative/narrativeDocument";
import { getBriefingContentBudget } from "@/lib/domain/narrative/briefingContentBudget";

const PRESENTATION_FIELDS: Array<[string, ManagedNarrativeObjectKey]> = [
  ["executiveSummaryPresentationMode", "executive-summary"],
  ["achievementsPresentationMode", "accomplishments"],
  ["issuesPresentationMode", "issues-concerns"],
  ["nextStepsPresentationMode", "next-steps"],
  ["managementAskPresentationMode", "management-ask"],
  ["conclusionPresentationMode", "conclusion"],
];

function parsePresentationPreferences(formData: FormData) {
  return Object.fromEntries(
    PRESENTATION_FIELDS.flatMap(([field, objectKey]) => {
      const value = String(formData.get(field) || "AUTO");
      return ["AUTO", "CHECKPOINTS", "BULLETS", "PARAGRAPH"].includes(value)
        ? [[objectKey, value as NarrativePresentationPreference]]
        : [];
    })
  ) as Partial<Record<ManagedNarrativeObjectKey, NarrativePresentationPreference>>;
}

export async function createFirstReportingPack(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");

  if (!projectId) return;

  await prisma.projectReportingPack.create({
    data: {
      projectId,
      title: "Executive Reporting Pack v1",
      reportingDate: new Date(),
      reportingPeriod: null,
      version: 1,
      status: "DRAFT",
      reportIndex: DEFAULT_REPORT_INDEX,
      executiveSummary: null,
      achievements: null,
      issues: null,
      nextSteps: null,
      managementAsk: null,
      conclusion: null,
      isActive: true,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function createReportingPackFromLatest(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");

  if (!projectId) return;

  const latestClosedPack = await getLatestNextDraftSourcePack(projectId);

  if (!latestClosedPack) {
    revalidatePath(`/projects/${projectId}`);
    return;
  }

  const latestAnyPack = await getLatestReportingPack(projectId);

  const nextVersion = getNextReportingPackVersion(latestAnyPack);

  await prisma.projectReportingPack.create({
    data: {
      projectId,
      title: getNextDraftTitle(nextVersion),
      reportingDate: new Date(),
      version: nextVersion,
      status: "DRAFT",
      ...getNextDraftShellData(latestClosedPack),
      isActive: true,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateReportingPack(formData: FormData) {
  const id = String(formData.get("id") || "");
  const projectId = String(formData.get("projectId") || "");
  const input = parseReportingPackInput(formData);

  try {
    if (!id || !projectId) {
      return {
        ok: false,
        message: "Reporting pack not updated: required identifiers are missing.",
      };
    }

    const validation = validateReportingPackInput(input);
    if (!validation.ok) return validation;

    const currentPack = await getReportingPackStatus(id);

    if (isReportingPackLocked(currentPack?.status ?? null)) {
      return {
        ok: false,
        message:
          "Reporting pack not updated: approved or archived versions are read-only. Create a new draft for further updates.",
      };
    }

    await prisma.projectReportingPack.update({
      where: { id },
      data: {
        title: input.title,
        reportingDate: input.reportingDate,
        reportingPeriod: input.reportingPeriod,
        status: input.status,
        reportIndex: input.reportIndex,
        executiveSummary: input.executiveSummary,
        achievements: input.achievements,
        issues: input.issues,
        nextSteps: input.nextSteps,
        managementAsk: input.managementAsk,
        conclusion: input.conclusion,
      },
    });

    revalidatePath(`/projects/${projectId}`);

    return {
      ok: true,
      message: "Reporting pack updated successfully.",
    };
  } catch (e: unknown) {
    console.error("Update reporting pack error:", e);
    const message = e instanceof Error ? e.message : "database error.";

    return {
      ok: false,
      message: `Reporting pack not updated: ${message}`,
    };
  }
}

export async function copyPreviousReportingPackNarrative(formData: FormData) {
  const id = String(formData.get("id") || "");
  const projectId = String(formData.get("projectId") || "");

  try {
    if (!id || !projectId) {
      return {
        ok: false,
        message:
          "Narrative not copied: required reporting pack identifiers are missing.",
      };
    }

    const currentPack = await getReportingPackStatus(id);

    if (!currentPack || currentPack.projectId !== projectId) {
      return {
        ok: false,
        message: "Narrative not copied: reporting pack was not found.",
      };
    }

    if (isReportingPackLocked(currentPack.status)) {
      return {
        ok: false,
        message:
          "Narrative not copied: approved or archived versions are read-only.",
      };
    }

    const sourcePack = await getLatestNextDraftSourcePack(projectId);

    if (!sourcePack) {
      return {
        ok: false,
        message:
          "Narrative not copied: no ready or approved source report was found.",
      };
    }

    if (sourcePack.id === id) {
      return {
        ok: false,
        message:
          "Narrative not copied: the selected reporting pack is already the latest source.",
      };
    }

    const narrative = {
      executiveSummary: sourcePack.executiveSummary ?? null,
      achievements: sourcePack.achievements ?? null,
      issues: sourcePack.issues ?? null,
      nextSteps: sourcePack.nextSteps ?? null,
      managementAsk: sourcePack.managementAsk ?? null,
      conclusion: sourcePack.conclusion ?? null,
    };

    await prisma.projectReportingPack.update({
      where: { id },
      data: narrative,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/executive-report");

    return {
      ok: true,
      message: `Narrative copied from ${sourcePack.title}.`,
      narrative,
    };
  } catch (e: unknown) {
    console.error("Copy previous reporting pack narrative error:", e);
    const message = e instanceof Error ? e.message : "database error.";

    return {
      ok: false,
      message: `Narrative not copied: ${message}`,
    };
  }
}

export async function submitReportingPackNarrativeForReview(formData: FormData) {
  const id = String(formData.get("id") || "");
  const projectId = String(formData.get("projectId") || "");

  try {
    if (!id || !projectId) {
      return { ok: false, message: "Narrative not submitted: required identifiers are missing." };
    }

    const pack = await prisma.projectReportingPack.findFirst({
      where: { id, projectId },
      include: { project: { select: { defaultLanguage: true } } },
    });
    if (!pack) return { ok: false, message: "Narrative not submitted: reporting pack was not found." };

    const presentationPreferences = parsePresentationPreferences(formData);
    const created = await prisma.$transaction((tx) =>
      createNarrativeProposals({
        tx,
        projectId,
        sourceReportingPackId: id,
        language: pack.project.defaultLanguage,
        narrative: {
          executiveSummary: pack.executiveSummary,
          achievements: pack.achievements,
          issues: pack.issues,
          nextSteps: pack.nextSteps,
          managementAsk: pack.managementAsk,
          conclusion: pack.conclusion,
        },
        presentationPreferences,
      })
    );

    revalidatePath(`/projects/${projectId}`);
    return {
      ok: true,
      message: created
        ? `${created} narrative proposal${created === 1 ? "" : "s"} submitted for review.`
        : "No new proposals were needed; the current content is already under review or approved.",
    };
  } catch (e: unknown) {
    console.error("Submit narrative for review error:", e);
    return { ok: false, message: `Narrative not submitted: ${e instanceof Error ? e.message : "database error."}` };
  }
}

export async function generateReportingPackNarrativeProposals(formData: FormData) {
  const id = String(formData.get("id") || "");
  const projectId = String(formData.get("projectId") || "");

  try {
    if (!id || !projectId) {
      return { ok: false, message: "Narrative not generated: required identifiers are missing." };
    }

    const [pack, project, previousPack] = await Promise.all([
      prisma.projectReportingPack.findFirst({ where: { id, projectId } }),
      prisma.project.findUnique({
        where: { id: projectId },
        include: {
          projectWorkstreams: {
            where: { isActive: true },
            include: { workstream: true },
          },
          events: { where: { isActive: true } },
          projectRisks: {
            where: { isActive: true },
            include: { status: true },
          },
          projectDecisions: {
            where: { isActive: true },
            include: { statusRef: true },
          },
          timeEntries: {
            include: {
              projectWorkstream: { include: { workstream: true } },
              projectTask: true,
            },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          },
        },
      }),
      prisma.projectReportingPack.findFirst({
        where: {
          projectId,
          id: { not: id },
          status: { in: ["READY", "APPROVED"] },
        },
        orderBy: [{ reportingDate: "desc" }, { version: "desc" }],
        select: { reportingDate: true },
      }),
    ]);

    if (!pack || !project) {
      return { ok: false, message: "Narrative not generated: reporting pack or project was not found." };
    }
    if (isReportingPackLocked(pack.status)) {
      return { ok: false, message: "Narrative not generated: approved or archived reports are read-only." };
    }

    const reportingDate = pack.reportingDate;
    const comparisonDate = previousPack?.reportingDate ?? new Date(
      reportingDate.getFullYear(),
      reportingDate.getMonth(),
      reportingDate.getDate() - 30
    );
    const configuredLanguages =
      project.reportLanguageMode === "BILINGUAL"
        ? (["EN", "ES"] as const)
        : ([project.reportLanguageMode === "ES" ? "ES" : "EN"] as const);
    const requestedLanguage = String(formData.get("narrativeLanguage") || "");
    const generationLanguages: Array<"EN" | "ES"> =
      requestedLanguage === "EN" || requestedLanguage === "ES"
        ? [requestedLanguage]
        : [...configuredLanguages];
    const generatedByLanguage = generationLanguages.map((language) => {
      const detailed = generateReportingPackNarrative({
        project: { ...project, defaultLanguage: language },
        reportingDate,
        comparisonDate,
      });
      return { language, detailed, short: generateShortReportingPackNarrative(detailed) };
    });
    const primaryGeneration = generatedByLanguage[0];
    const narrative = primaryGeneration.detailed;
    const presentationPreferences = parsePresentationPreferences(formData);
    const evidenceSnapshot = {
      comparisonDate: comparisonDate.toISOString(),
      reportingDate: reportingDate.toISOString(),
      timeEntryIds: project.timeEntries
        .filter((entry) => entry.date > comparisonDate && entry.date <= reportingDate)
        .map((entry) => entry.id),
      workstreamIds: project.projectWorkstreams.map((workstream) => workstream.id),
      eventIds: project.events.map((event) => event.id),
      riskIds: project.projectRisks.map((risk) => risk.id),
      decisionIds: project.projectDecisions.map((decision) => decision.id),
    };

    const created = await prisma.$transaction(async (tx) => {
      await tx.projectReportingPack.update({ where: { id }, data: narrative });
      let count = 0;
      for (const generation of generatedByLanguage) {
        count += await createNarrativeProposals({
          tx,
          projectId,
          sourceReportingPackId: id,
          language: generation.language,
          narrative: generation.detailed,
          sourceType: "GENERATED",
          evidenceSnapshot,
          presentationPreferences,
          variant: "DETAILED",
        });
        count += await createNarrativeProposals({
          tx,
          projectId,
          sourceReportingPackId: id,
          language: generation.language,
          narrative: generation.short,
          sourceType: "GENERATED",
          evidenceSnapshot,
          presentationPreferences,
          variant: "SHORT",
        });
      }
      return count;
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/executive-report");
    return {
      ok: true,
      message: `${created} generated narrative proposal${created === 1 ? "" : "s"} ready for review.`,
      narrative,
    };
  } catch (e: unknown) {
    console.error("Generate reporting pack narrative error:", e);
    return { ok: false, message: `Narrative not generated: ${e instanceof Error ? e.message : "database error."}` };
  }
}

export async function reviewNarrativeProposal(formData: FormData) {
  const revisionId = String(formData.get("revisionId") || "");
  const projectId = String(formData.get("projectId") || "");
  const decision = String(formData.get("decision") || "");

  if (!revisionId || !projectId || !["APPROVE", "REJECT", "PUBLISH"].includes(decision)) {
    return { ok: false, message: "Narrative review not recorded: invalid request." };
  }

  if (decision === "APPROVE") {
    const pending = await prisma.managedNarrativeRevision.findFirst({
      where: { id: revisionId, status: "PROPOSED", narrative: { projectId } },
      include: { narrative: { select: { objectKey: true, variant: true } } },
    });
    if (
      pending?.narrative.variant === "SHORT" &&
      !getBriefingContentBudget(
        pending.content,
        pending.narrative.objectKey as ManagedNarrativeObjectKey
      ).fits
    ) {
      return { ok: false, message: "Short narrative exceeds the one-page briefing budget. Edit it before approval." };
    }
  }

  const changed = await prisma.$transaction(async (tx) => {
    if (decision === "APPROVE") {
      return approveNarrativeRevision({ tx, revisionId, projectId });
    }
    if (decision === "REJECT") {
      return rejectNarrativeRevision({ tx, revisionId, projectId });
    }
    const result = await tx.managedNarrativeRevision.updateMany({
      where: {
        id: revisionId,
        status: "APPROVED",
        narrative: { projectId },
      },
      data: { publishedAt: new Date() },
    });
    return result.count > 0;
  });
  if (!changed) return { ok: false, message: "Narrative review not recorded: the proposal is no longer pending." };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/executive-report");
  return {
    ok: true,
    message:
      decision === "APPROVE"
        ? "Narrative revision approved."
        : decision === "PUBLISH"
          ? "Narrative revision published to report outputs."
          : "Narrative proposal rejected.",
  };
}

export async function updateNarrativeProposal(formData: FormData) {
  const revisionId = String(formData.get("revisionId") || "");
  const projectId = String(formData.get("projectId") || "");
  const content = String(formData.get("content") || "").trim();

  if (!revisionId || !projectId || !content) {
    return { ok: false, message: "Narrative proposal not saved: content is required." };
  }

  const revision = await prisma.managedNarrativeRevision.findFirst({
    where: { id: revisionId, status: "PROPOSED", narrative: { projectId } },
    include: { narrative: { select: { objectKey: true } } },
  });
  if (!revision) {
    return { ok: false, message: "Narrative proposal not saved: it is no longer pending." };
  }

  const mode = resolveNarrativePresentationMode({
    preference: revision.presentationMode as NarrativePresentationPreference,
    objectKey: revision.narrative.objectKey,
  });
  await prisma.managedNarrativeRevision.update({
    where: { id: revision.id },
    data: {
      content,
      documentJson: serializeNarrativeDocument(parseNarrativeDocument(content, mode)),
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "Narrative proposal saved." };
}

export async function archiveReportingPack(formData: FormData) {
  const id = String(formData.get("id") || "");
  const projectId = String(formData.get("projectId") || "");

  if (!id || !projectId) return;

  await prisma.projectReportingPack.update({
    where: { id },
    data: {
      status: "ARCHIVED",
      isActive: false,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteDraftReportingPack(formData: FormData) {
  const id = String(formData.get("id") || "");
  const projectId = String(formData.get("projectId") || "");

  if (!id || !projectId) return;

  const currentPack = await getReportingPackStatus(id);

  if (!currentPack || currentPack.projectId !== projectId) return;
  if (!canDeleteReportingPack(currentPack.status)) return;

  await prisma.$transaction(async (tx) => {
    await tx.managedNarrativeRevision.deleteMany({
      where: {
        sourceReportingPackId: id,
        approvedAt: null,
      },
    });
    await tx.projectReportingPack.delete({ where: { id } });
    await tx.managedNarrative.deleteMany({
      where: { projectId, revisions: { none: {} } },
    });
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/executive-report");
}
