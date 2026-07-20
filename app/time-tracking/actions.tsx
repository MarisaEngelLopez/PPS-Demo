"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSelectedWorkspace } from "@/lib/workspaceContext";

type TimeEntryActionResult = {
  ok: boolean;
  message: string;
};

function ok(message: string): TimeEntryActionResult {
  return { ok: true, message };
}

function error(message: string): TimeEntryActionResult {
  return { ok: false, message };
}

function revalidateTimeTrackingPages() {
  revalidatePath("/time-tracking");
  revalidatePath("/time-tracking/assistant");
}

async function validateTimeEntryLinks({
  projectId,
  projectWorkstreamId,
  taskFamilyId,
  projectTaskId,
}: {
  projectId: string;
  projectWorkstreamId: string;
  taskFamilyId: string;
  projectTaskId: string;
}) {
  const selectedWorkspace = await getSelectedWorkspace();
  const [project, projectWorkstream, taskFamily, projectTask] = await Promise.all([
    prisma.project.findFirst({
      where: { id: projectId, isActive: true, workspaceId: selectedWorkspace.id },
    }),
    prisma.projectWorkstream.findFirst({
      where: {
        id: projectWorkstreamId,
        projectId,
        project: { workspaceId: selectedWorkspace.id },
      },
    }),
    prisma.taskFamily.findFirst({ where: { id: taskFamilyId, isActive: true } }),
    projectTaskId
      ? prisma.projectTask.findFirst({
          where: {
            id: projectTaskId,
            projectWorkstreamId,
            isActive: true,
            projectWorkstream: { project: { workspaceId: selectedWorkspace.id } },
          },
        })
      : Promise.resolve(null),
  ]);

  if (!project) return "Time entry not saved: selected project is inactive or missing.";
  if (!projectWorkstream) {
    return "Time entry not saved: selected workstream is missing or does not belong to the project.";
  }
  if (!taskFamily) {
    return "Time entry not saved: selected task family is inactive or missing.";
  }
  if (projectTaskId && !projectTask) {
    return "Time entry not saved: selected task does not belong to the workstream.";
  }

  return null;
}

export async function createTimeEntry(formData: FormData) {
  const projectId = String(formData.get("projectId") || "").trim();
  const projectWorkstreamId = String(
    formData.get("projectWorkstreamId") || ""
  ).trim();
  const taskFamilyId = String(formData.get("taskFamilyId") || "").trim();
  const projectTaskId = String(formData.get("projectTaskId") || "").trim();

  const date = String(formData.get("date") || "").trim();
  const hours = Number(formData.get("hours") || 0);
  const notes = String(formData.get("notes") || "").trim();

  if (!projectId || !projectWorkstreamId || !taskFamilyId || !date || !hours) {
    return error("Time entry not created: project, workstream, family, date and hours are required.");
  }

  if (hours <= 0) return error("Time entry not created: hours must be greater than zero.");

  try {
    const linkError = await validateTimeEntryLinks({
      projectId,
      projectWorkstreamId,
      taskFamilyId,
      projectTaskId,
    });
    if (linkError) return error(linkError);

    await prisma.timeEntry.create({
      data: {
        projectId,
        projectWorkstreamId,
        taskFamilyId,
        projectTaskId: projectTaskId || null,
        date: new Date(date),
        hours,
        notes: notes || null,
      },
    });

    revalidateTimeTrackingPages();
    return ok("Time entry created successfully.");
  } catch (err) {
    return error(
      `Time entry not created: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}

export async function updateTimeEntry(formData: FormData) {
  const id = String(formData.get("id") || "").trim();

  const projectId = String(formData.get("projectId") || "").trim();
  const projectWorkstreamId = String(
    formData.get("projectWorkstreamId") || ""
  ).trim();
  const taskFamilyId = String(formData.get("taskFamilyId") || "").trim();
  const projectTaskId = String(formData.get("projectTaskId") || "").trim();

  const date = String(formData.get("date") || "").trim();
  const hours = Number(formData.get("hours") || 0);
  const notes = String(formData.get("notes") || "").trim();

  if (!id || !projectId || !projectWorkstreamId || !taskFamilyId || !date || !hours) {
    return error("Time entry not updated: missing required data.");
  }

  if (hours <= 0) return error("Time entry not updated: hours must be greater than zero.");

  try {
    const existing = await prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) return error("Time entry not updated: it no longer exists.");
    const selectedWorkspace = await getSelectedWorkspace();
    const existingInWorkspace = await prisma.timeEntry.findFirst({
      where: { id, project: { workspaceId: selectedWorkspace.id } },
      select: { id: true },
    });
    if (!existingInWorkspace) {
      return error("Time entry not updated: it does not belong to the selected workspace.");
    }

    const linkError = await validateTimeEntryLinks({
      projectId,
      projectWorkstreamId,
      taskFamilyId,
      projectTaskId,
    });
    if (linkError) return error(linkError);

    await prisma.timeEntry.update({
      where: { id },
      data: {
        projectId,
        projectWorkstreamId,
        taskFamilyId,
        projectTaskId: projectTaskId || null,
        date: new Date(date),
        hours,
        notes: notes || null,
      },
    });

    revalidateTimeTrackingPages();
    return ok("Time entry updated successfully.");
  } catch (err) {
    return error(
      `Time entry not updated: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}

export async function deleteTimeEntry(formData: FormData) {
  const id = String(formData.get("id") || "").trim();

  if (!id) return error("Time entry not deleted: missing id.");

  try {
    const existing = await prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) return error("Time entry not deleted: it no longer exists.");
    const selectedWorkspace = await getSelectedWorkspace();
    const existingInWorkspace = await prisma.timeEntry.findFirst({
      where: { id, project: { workspaceId: selectedWorkspace.id } },
      select: { id: true },
    });
    if (!existingInWorkspace) {
      return error("Time entry not deleted: it does not belong to the selected workspace.");
    }

    await prisma.timeEntry.delete({
      where: { id },
    });

    revalidateTimeTrackingPages();
    return ok("Time entry deleted successfully.");
  } catch (err) {
    return error(
      `Time entry not deleted: ${err instanceof Error ? err.message : "unexpected error."}`
    );
  }
}
