"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  EXECUTIVE_INTELLIGENCE_CATEGORIES,
  EXECUTIVE_INTELLIGENCE_CONFIDENCES,
  EXECUTIVE_INTELLIGENCE_SENSITIVITIES,
  EXECUTIVE_INTELLIGENCE_VISIBILITIES,
  type ExecutiveIntelligenceCategory,
  type ExecutiveIntelligenceConfidence,
  type ExecutiveIntelligenceSensitivity,
  type ExecutiveIntelligenceVisibility,
} from "@/lib/domain/executiveIntelligence/executiveIntelligenceContract";

export type ExecutiveIntelligenceActionResult = {
  ok: boolean;
  message: string;
};

function ok(message: string): ExecutiveIntelligenceActionResult {
  return { ok: true, message };
}

function error(message: string): ExecutiveIntelligenceActionResult {
  return { ok: false, message };
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text === "" ? null : text;
}

function dateOrNull(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(`${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateValue<T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T
) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function revalidateExecutiveIntelligence() {
  revalidatePath("/knowledge");
  revalidatePath("/knowledge/executive-intelligence");
}

export async function createExecutiveIntelligence(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const note = String(formData.get("note") || "").trim();

  if (!organizationId || !note) {
    return error("Executive intelligence not created: organization and note are required.");
  }

  try {
    await prisma.executiveIntelligence.create({
      data: {
        organizationId,
        contactId: textOrNull(formData.get("contactId")),
        category: validateValue<ExecutiveIntelligenceCategory>(
          String(formData.get("category") || ""),
          EXECUTIVE_INTELLIGENCE_CATEGORIES,
          "ORGANIZATIONAL_INSIGHT"
        ),
        sensitivity: validateValue<ExecutiveIntelligenceSensitivity>(
          String(formData.get("sensitivity") || ""),
          EXECUTIVE_INTELLIGENCE_SENSITIVITIES,
          "INTERNAL"
        ),
        confidence: validateValue<ExecutiveIntelligenceConfidence>(
          String(formData.get("confidence") || ""),
          EXECUTIVE_INTELLIGENCE_CONFIDENCES,
          "MEDIUM"
        ),
        note,
        source: textOrNull(formData.get("source")),
        visibility: validateValue<ExecutiveIntelligenceVisibility>(
          String(formData.get("visibility") || ""),
          EXECUTIVE_INTELLIGENCE_VISIBILITIES,
          "RESTRICTED"
        ),
        lastReviewed: dateOrNull(formData.get("lastReviewed")),
        createdByUserId: textOrNull(formData.get("createdByUserId")),
      },
    });

    revalidateExecutiveIntelligence();
    return ok("Executive intelligence created successfully.");
  } catch (err) {
    return error(
      `Executive intelligence not created: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}

export async function updateExecutiveIntelligence(formData: FormData) {
  const id = String(formData.get("id") || "");
  const organizationId = String(formData.get("organizationId") || "");
  const note = String(formData.get("note") || "").trim();

  if (!id || !organizationId || !note) {
    return error("Executive intelligence not updated: id, organization and note are required.");
  }

  try {
    await prisma.executiveIntelligence.update({
      where: { id },
      data: {
        organizationId,
        contactId: textOrNull(formData.get("contactId")),
        category: validateValue<ExecutiveIntelligenceCategory>(
          String(formData.get("category") || ""),
          EXECUTIVE_INTELLIGENCE_CATEGORIES,
          "ORGANIZATIONAL_INSIGHT"
        ),
        sensitivity: validateValue<ExecutiveIntelligenceSensitivity>(
          String(formData.get("sensitivity") || ""),
          EXECUTIVE_INTELLIGENCE_SENSITIVITIES,
          "INTERNAL"
        ),
        confidence: validateValue<ExecutiveIntelligenceConfidence>(
          String(formData.get("confidence") || ""),
          EXECUTIVE_INTELLIGENCE_CONFIDENCES,
          "MEDIUM"
        ),
        note,
        source: textOrNull(formData.get("source")),
        visibility: validateValue<ExecutiveIntelligenceVisibility>(
          String(formData.get("visibility") || ""),
          EXECUTIVE_INTELLIGENCE_VISIBILITIES,
          "RESTRICTED"
        ),
        lastReviewed: dateOrNull(formData.get("lastReviewed")),
      },
    });

    revalidateExecutiveIntelligence();
    return ok("Executive intelligence updated successfully.");
  } catch (err) {
    return error(
      `Executive intelligence not updated: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}

export async function deleteExecutiveIntelligence(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return error("Executive intelligence not deleted: missing id.");

  try {
    await prisma.executiveIntelligence.delete({ where: { id } });
    revalidateExecutiveIntelligence();
    return ok("Executive intelligence deleted successfully.");
  } catch (err) {
    return error(
      `Executive intelligence not deleted: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}
