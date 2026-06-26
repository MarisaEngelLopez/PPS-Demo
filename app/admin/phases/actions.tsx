"use server";

import { getPhaseAdminRows } from "@/lib/domain/phases/phaseQueries";
import {
  parsePhaseInput,
  phaseError,
  phaseOk,
  validatePhaseInput,
} from "@/lib/domain/phases/phaseValidation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const PHASES_PATH = "/admin/phases";

export async function createPhase(formData: FormData) {
  const input = parsePhaseInput(formData);

  try {
    const validation = await validatePhaseInput(input);
    if (validation) return validation;

    await prisma.phase.create({
      data: {
        ...input,
        isActive: true,
      },
    });

    revalidatePath(PHASES_PATH);

    return phaseOk("Phase created successfully.");
  } catch (e) {
    console.error("Create phase error:", e);

    return phaseError("Phase not added: database error.");
  }
}

export async function updatePhase(formData: FormData) {
  const id = String(formData.get("id") || "");
  const input = parsePhaseInput(formData);

  try {
    if (!id) return phaseError("Phase not updated: missing id.");

    const validation = await validatePhaseInput(input, id);
    if (validation) return validation;

    await prisma.phase.update({
      where: { id },
      data: input,
    });

    revalidatePath(PHASES_PATH);

    return phaseOk("Phase updated successfully.");
  } catch (e) {
    console.error("Update phase error:", e);

    return phaseError("Phase not updated: database error.");
  }
}

export async function togglePhase(formData: FormData) {
  const id = String(formData.get("id"));
  const current = formData.get("current") === "true";

  try {
    const existing = await prisma.phase.findUnique({
      where: { id },
    });

    if (!existing) {
      return phaseError("Phase not updated: it no longer exists.");
    }

    const updated = await prisma.phase.update({
      where: { id },
      data: {
        isActive: !current,
      },
    });

    revalidatePath(PHASES_PATH);

    return phaseOk(
      updated.isActive
        ? "Phase activated successfully."
        : "Phase deactivated successfully."
    );
  } catch (e) {
    console.error("Toggle phase error:", e);

    return phaseError("Phase not updated: database error.");
  }
}

export async function deletePhase(formData: FormData) {
  const id = String(formData.get("id"));

  try {
    const existing = await prisma.phase.findUnique({
      where: { id },
    });

    if (!existing) {
      return phaseError("Phase not deleted: it no longer exists.");
    }

    if (existing.isActive) {
      return phaseError("Phase not deleted: deactivate it first.");
    }

    const workstreamCount = await prisma.workstream.count({
      where: { phaseId: id },
    });

    if (workstreamCount > 0) {
      return phaseError("Phase not deleted: it is already used by workstreams.");
    }

    await prisma.phase.delete({
      where: { id },
    });

    revalidatePath(PHASES_PATH);

    return phaseOk("Phase deleted successfully.");
  } catch (e) {
    console.error("Delete phase error:", e);

    return phaseError("Phase not deleted: database error.");
  }
}

export async function listPhaseAdminRows() {
  return getPhaseAdminRows();
}
