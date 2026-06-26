"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actionErrors";

async function validateParentTask(
  parentTaskId: string,
  projectWorkstreamId: string
) {
  const parent = await prisma.projectTask.findUnique({
    where: { id: parentTaskId },
  });

  if (!parent) {
    throw new Error("Parent task not found");
  }

  if (parent.projectWorkstreamId !== projectWorkstreamId) {
    throw new Error("Parent task belongs to another workstream");
  }

  if (parent.parentTaskId) {
    throw new Error("Subtasks cannot have children");
  }

  return parent;
}

export async function createSubtask(formData: FormData): Promise<ActionResult> {
  try {
    const projectWorkstreamId = String(formData.get("projectWorkstreamId"));
    const parentTaskId = String(formData.get("parentTaskId"));
    const name = String(formData.get("name"));

    if (!name.trim()) {
      return {
        ok: false,
        message: "Subtask name is required",
      };
    }

    await validateParentTask(parentTaskId, projectWorkstreamId);

    const maxSort = await prisma.projectTask.aggregate({
      where: {
        parentTaskId,
        isActive: true,
      },
      _max: {
        sortOrder: true,
      },
    });

    await prisma.projectTask.create({
      data: {
        projectWorkstreamId,
        parentTaskId,
        name,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    revalidatePath("/projects");

    return {
      ok: true,
      message: "Subtask created",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to create subtask",
    };
  }
}