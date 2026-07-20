"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSelectedWorkspace } from "@/lib/workspaceContext";
import {
  CUSTOMER_DNA_CATEGORIES,
  CUSTOMER_DNA_PRIORITIES,
  CUSTOMER_DNA_STATUSES,
  type CustomerDnaCategory,
  type CustomerDnaPriority,
  type CustomerDnaStatus,
} from "@/lib/domain/customerDna/customerDnaContract";

export type CustomerDnaActionResult = {
  ok: boolean;
  message: string;
};

function ok(message: string): CustomerDnaActionResult {
  return { ok: true, message };
}

function error(message: string): CustomerDnaActionResult {
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

function revalidateCustomerDna() {
  revalidatePath("/customer-dna");
  revalidatePath("/attention");
}

async function projectBelongsToSelectedWorkspace(projectId: string) {
  const selectedWorkspace = await getSelectedWorkspace();
  return prisma.project.findFirst({
    where: { id: projectId, workspaceId: selectedWorkspace.id, isActive: true },
    select: { id: true },
  });
}

export async function createCustomerDna(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const statement = String(formData.get("statement") || "").trim();

  if (!projectId || !statement) {
    return error("Customer DNA not created: project and statement are required.");
  }

  try {
    const project = await projectBelongsToSelectedWorkspace(projectId);
    if (!project) {
      return error("Customer DNA not created: project is not in the selected workspace.");
    }

    await prisma.customerDna.create({
      data: {
        projectId,
        category: validateValue<CustomerDnaCategory>(
          String(formData.get("category") || ""),
          CUSTOMER_DNA_CATEGORIES,
          "STRATEGIC_GOAL"
        ),
        priority: validateValue<CustomerDnaPriority>(
          String(formData.get("priority") || ""),
          CUSTOMER_DNA_PRIORITIES,
          "MEDIUM"
        ),
        statement,
        status: validateValue<CustomerDnaStatus>(
          String(formData.get("status") || ""),
          CUSTOMER_DNA_STATUSES,
          "NOT_ADDRESSED"
        ),
        ownerId: textOrNull(formData.get("ownerId")),
        lastReviewed: dateOrNull(formData.get("lastReviewed")),
        createdByUserId: textOrNull(formData.get("createdByUserId")),
      },
    });

    revalidateCustomerDna();
    return ok("Customer DNA created successfully.");
  } catch (err) {
    return error(
      `Customer DNA not created: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}

export async function updateCustomerDna(formData: FormData) {
  const id = String(formData.get("id") || "");
  const projectId = String(formData.get("projectId") || "");
  const statement = String(formData.get("statement") || "").trim();

  if (!id || !projectId || !statement) {
    return error("Customer DNA not updated: id, project and statement are required.");
  }

  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const [project, existing] = await Promise.all([
      prisma.project.findFirst({
        where: { id: projectId, workspaceId: selectedWorkspace.id, isActive: true },
        select: { id: true },
      }),
      prisma.customerDna.findFirst({
        where: { id, project: { workspaceId: selectedWorkspace.id } },
        select: { id: true },
      }),
    ]);
    if (!project || !existing) {
      return error("Customer DNA not updated: record is not in the selected workspace.");
    }

    await prisma.customerDna.update({
      where: { id },
      data: {
        projectId,
        category: validateValue<CustomerDnaCategory>(
          String(formData.get("category") || ""),
          CUSTOMER_DNA_CATEGORIES,
          "STRATEGIC_GOAL"
        ),
        priority: validateValue<CustomerDnaPriority>(
          String(formData.get("priority") || ""),
          CUSTOMER_DNA_PRIORITIES,
          "MEDIUM"
        ),
        statement,
        status: validateValue<CustomerDnaStatus>(
          String(formData.get("status") || ""),
          CUSTOMER_DNA_STATUSES,
          "NOT_ADDRESSED"
        ),
        ownerId: textOrNull(formData.get("ownerId")),
        lastReviewed: dateOrNull(formData.get("lastReviewed")),
      },
    });

    revalidateCustomerDna();
    return ok("Customer DNA updated successfully.");
  } catch (err) {
    return error(
      `Customer DNA not updated: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}

export async function deleteCustomerDna(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return error("Customer DNA not deleted: missing id.");

  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const item = await prisma.customerDna.findFirst({
      where: { id, project: { workspaceId: selectedWorkspace.id } },
    });
    if (!item) return error("Customer DNA not deleted: not found.");
    if (item.status !== "NOT_ADDRESSED") {
      return error(
        "Customer DNA not deleted: only Not Addressed items can be deleted. Change status or keep it as knowledge history."
      );
    }

    await prisma.customerDna.delete({ where: { id } });
    revalidateCustomerDna();
    return ok("Customer DNA deleted successfully.");
  } catch (err) {
    return error(
      `Customer DNA not deleted: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}
