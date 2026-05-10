"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTimeEntry(formData: FormData) {
  const projectId = String(formData.get("projectId") || "").trim();
  const projectWorkstreamId = String(formData.get("projectWorkstreamId") || "").trim();
  const date = String(formData.get("date") || "").trim();
  const hours = Number(formData.get("hours") || 0);
  const description = String(formData.get("description") || "").trim();

  if (!projectId || !date || !hours) return;

  await prisma.timeEntry.create({
    data: {
      projectId,
      projectWorkstreamId: projectWorkstreamId || null,
      date: new Date(date),
      hours,
      description: description || null,
    },
  });

  revalidatePath("/time-tracking");
}

export async function deleteTimeEntry(formData: FormData) {
  const id = String(formData.get("id"));

  await prisma.timeEntry.delete({
    where: { id },
  });

  revalidatePath("/time-tracking");
}