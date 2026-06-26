"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function textOrNull(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text === "" ? null : text;
}

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  if (text === "") return null;

  const number = Number(text);
  return Number.isNaN(number) ? null : number;
}

export async function addProjectWorkstream(
  projectId: string,
  formData: FormData
) {
  const workstreamId = String(formData.get("workstreamId") || "").trim();

  const startDate = String(formData.get("startDate") || "").trim();
  const endDate = String(formData.get("endDate") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  const visibility = String(formData.get("visibility") || "BOTH").trim();

  if (!projectId || !workstreamId) return;

  await prisma.projectWorkstream.create({
    data: {
      projectId,
      workstreamId,

      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      notes: notes || null,

      customName: textOrNull(formData.get("customName")),
      reportingName: textOrNull(formData.get("reportingName")),
      objective: textOrNull(formData.get("objective")),
      deliverable: textOrNull(formData.get("deliverable")),
      visibility: visibility || "BOTH",

      plannedQuantity: numberOrNull(formData.get("plannedQuantity")),
      actualQuantity: numberOrNull(formData.get("actualQuantity")),
      measureUnit: textOrNull(formData.get("measureUnit")),
      quantityType: textOrNull(formData.get("quantityType")),
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectWorkstreamDetails(
  projectId: string,
  formData: FormData
) {
  const id = String(formData.get("id") || "").trim();

  if (!projectId || !id) return;

  await prisma.projectWorkstream.update({
    where: { id },
    data: {
      customName: textOrNull(formData.get("customName")),
      reportingName: textOrNull(formData.get("reportingName")),
      objective: textOrNull(formData.get("objective")),
      deliverable: textOrNull(formData.get("deliverable")),
      visibility: String(formData.get("visibility") || "BOTH").trim(),

      plannedQuantity: numberOrNull(formData.get("plannedQuantity")),
      actualQuantity: numberOrNull(formData.get("actualQuantity")),
      measureUnit: textOrNull(formData.get("measureUnit")),
      quantityType: textOrNull(formData.get("quantityType")),
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function toggleProjectWorkstream(
  projectId: string,
  projectWorkstreamId: string
) {
  const current = await prisma.projectWorkstream.findUnique({
    where: { id: projectWorkstreamId },
  });

  if (!current) return;

  await prisma.projectWorkstream.update({
    where: { id: projectWorkstreamId },
    data: { isActive: !current.isActive },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectWorkstream(
  projectId: string,
  projectWorkstreamId: string
) {
  await prisma.projectWorkstream.delete({
    where: { id: projectWorkstreamId },
  });

  revalidatePath(`/projects/${projectId}`);
}
