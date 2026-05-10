"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addProjectWorkstream(
  projectId: string,
  formData: FormData
) {
  const workstreamId = String(formData.get("workstreamId") || "").trim();
  const statusId = String(formData.get("statusId") || "").trim();
  const startDate = String(formData.get("startDate") || "").trim();
  const endDate = String(formData.get("endDate") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!projectId || !workstreamId) return;

  await prisma.projectWorkstream.create({
    data: {
      projectId,
      workstreamId,
      statusId: statusId || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      notes: notes || null,
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