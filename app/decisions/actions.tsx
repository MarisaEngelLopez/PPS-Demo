"use server";

import { prisma } from "@/lib/prisma";
import { generateNextBusinessCode } from "@/lib/businessCodes/codeGenerator";
import {
  getClosedDecisionStatus,
  resolveDecisionStatusForInput,
} from "@/lib/domain/decisions/decisionQueries";
import { getDecisionStatusCode } from "@/lib/domain/decisions/decisionRules";
import {
  decisionError,
  decisionOk,
  parseDecisionInput,
  validateDecisionInput,
} from "@/lib/domain/decisions/decisionValidation";
import { revalidatePath } from "next/cache";
import { getSelectedWorkspace } from "@/lib/workspaceContext";

export async function createDecision(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const input = parseDecisionInput(formData);
    const inputError = validateDecisionInput(input);
    if (inputError) return inputError;

    await prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: {
          id: input.projectId,
          isActive: true,
          workspaceId: selectedWorkspace.id,
        },
        select: { id: true },
      });

      if (!project) {
        throw new Error("Select an active project.");
      }

      if (input.projectWorkstreamId) {
        const workstream = await tx.projectWorkstream.findFirst({
          where: {
            id: input.projectWorkstreamId,
            projectId: input.projectId,
            isActive: true,
            project: { workspaceId: selectedWorkspace.id },
          },
          select: { id: true },
        });

        if (!workstream) {
          throw new Error("Select an active workstream for the chosen project.");
        }
      }

      const status = await resolveDecisionStatusForInput(tx, input.statusCode);

      if (!status) {
        throw new Error("Configure at least one active decision status.");
      }

      const decisionCode = await generateNextBusinessCode(tx, "DECISION");

      await tx.projectDecision.create({
      data: {
        projectId: input.projectId,
        projectWorkstreamId: input.projectWorkstreamId,
        decisionCode,
        title: input.title,
        description: input.description,
        recommendation: input.recommendation,
        decision: input.decision,
        requestedBy: input.requestedBy,
        owner: input.owner,
        decisionDate: input.decisionDate,
        dueDate: input.dueDate,
        statusId: status.id,
        impact: input.impact,
        visibility: input.visibility,
        escalated: input.escalated,
        notes: input.notes,
        isActive: true,
      },
    });
    });

    revalidatePath("/decisions");

    return decisionOk("Decision created successfully.");
  } catch (error) {
    return decisionError(
      `Decision not created: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function updateDecision(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const id = String(formData.get("id") || "");

    if (!id) {
      return decisionError("Decision not updated: missing id.");
    }

    const input = parseDecisionInput(formData);
    const inputError = validateDecisionInput(input);
    if (inputError) return inputError;

    await prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: {
          id: input.projectId,
          isActive: true,
          workspaceId: selectedWorkspace.id,
        },
        select: { id: true },
      });

      if (!project) {
        throw new Error("Select an active project.");
      }

      if (input.projectWorkstreamId) {
        const workstream = await tx.projectWorkstream.findFirst({
          where: {
            id: input.projectWorkstreamId,
            projectId: input.projectId,
            isActive: true,
            project: { workspaceId: selectedWorkspace.id },
          },
          select: { id: true },
        });

        if (!workstream) {
          throw new Error("Select an active workstream for the chosen project.");
        }
      }

      const status = await resolveDecisionStatusForInput(tx, input.statusCode);

      if (!status) {
        throw new Error("Configure at least one active decision status.");
      }

      const existingDecision = await tx.projectDecision.findFirst({
        where: { id, project: { workspaceId: selectedWorkspace.id } },
        select: { id: true },
      });

      if (!existingDecision) {
        throw new Error("Decision not found in the selected workspace.");
      }

      await tx.projectDecision.update({
        where: { id },
        data: {
          projectId: input.projectId,
          projectWorkstreamId: input.projectWorkstreamId,
          decisionCode: input.decisionCode,
          title: input.title,
          description: input.description,
          recommendation: input.recommendation,
          decision: input.decision,
          requestedBy: input.requestedBy,
          owner: input.owner,
          decisionDate: input.decisionDate,
          dueDate: input.dueDate,
          statusId: status.id,
          impact: input.impact,
          visibility: input.visibility,
          escalated: input.escalated,
          notes: input.notes,
        },
      });
    });

    revalidatePath("/decisions");

    return decisionOk("Decision updated successfully.");
  } catch (error) {
    return decisionError(
      `Decision not updated: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function archiveDecision(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const id = String(formData.get("id") || "");

    await prisma.$transaction(async (tx) => {
      const closedStatus = await getClosedDecisionStatus(tx);
      if (!closedStatus) {
        throw new Error("Configure an active closed decision status.");
      }

      const decision = await tx.projectDecision.findFirst({
        where: { id, project: { workspaceId: selectedWorkspace.id } },
        select: { id: true },
      });
      if (!decision) {
        throw new Error("Decision not found in the selected workspace.");
      }

      await tx.projectDecision.update({
        where: { id },
        data: {
          isActive: false,
          statusId: closedStatus.id,
        },
      });
    });

    revalidatePath("/decisions");

    return decisionOk("Decision archived successfully.");
  } catch (error) {
    return decisionError(
      `Decision not archived: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function deleteDecision(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const id = String(formData.get("id") || "");

    if (!id) {
      return decisionError("Decision not deleted: missing id.");
    }

    await prisma.$transaction(async (tx) => {
      const decision = await tx.projectDecision.findFirst({
        where: { id, project: { workspaceId: selectedWorkspace.id } },
        include: { statusRef: true },
      });

      if (!decision) {
        throw new Error("Decision not found.");
      }

      const statusCode = getDecisionStatusCode(decision);

      if (statusCode !== "OPEN") {
        throw new Error("Only open decisions can be deleted.");
      }

      await tx.projectDecision.delete({
        where: { id },
      });
    });

    revalidatePath("/decisions");

    return decisionOk("Decision deleted successfully.");
  } catch (error) {
    return decisionError(
      `Decision not deleted: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}
