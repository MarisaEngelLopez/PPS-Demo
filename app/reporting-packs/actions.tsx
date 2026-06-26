"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_REPORT_INDEX,
  canDeleteReportingPack,
  getNextDraftTitle,
  getNextReportingPackVersion,
  getReportingPackCopyData,
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
      ...getReportingPackCopyData(latestClosedPack),
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

  await prisma.projectReportingPack.delete({
    where: { id },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/executive-report");
}
