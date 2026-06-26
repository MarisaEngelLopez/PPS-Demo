"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateNextBusinessCode } from "@/lib/businessCodes/codeGenerator";
import { applyTemplateToProject } from "@/lib/actions/projectTemplates";
import { assertProjectManagerContactExists } from "@/lib/domain/projects/projectBridge";
import {
  parseProjectCreateInput,
  parseProjectHeaderInput,
  validateProjectCreateInput,
  validateProjectHeaderInput,
} from "@/lib/domain/projects/projectValidation";
import {
  parseProjectEventInput,
  parseProjectTaskInput,
  parseProjectWorkstreamInput,
  validateProjectTaskDates,
  validateProjectWorkstreamDates,
} from "@/lib/domain/projectExecution/projectExecutionValidation";
import {
  ensureProjectWorkstreamIsNotAssigned,
  getActiveEventTypeForProjectEvent,
  getActiveWorkstreamForProjectAdd,
  getNextProjectTaskSortOrder,
  getProjectTaskForDelete,
  getProjectWorkstreamInProject,
  validateLinkedProjectWorkstream,
  validateProjectTaskForUpdate,
  validateProjectWorkstreamCanDelete,
  validateSubtaskParent,
} from "@/lib/domain/projectExecution/projectExecutionData";
import {
  projectExecutionError,
  projectExecutionOk,
} from "@/lib/domain/projectExecution/projectExecutionRules";
import { projectError, projectOk } from "@/lib/domain/projects/projectRules";

function projectPath(projectId: string) {
  return `/projects/${projectId}`;
}

function revalidateProjectExecution(projectId: string) {
  revalidatePath(projectPath(projectId));
  revalidatePath("/executive-report");
  revalidatePath("/executive-report/export");
}

export async function createProject(formData: FormData) {
  const input = parseProjectCreateInput(formData);

  try {
    const validationError = validateProjectCreateInput(input);
    if (validationError) return validationError;

    const project = await prisma.$transaction(async (tx) => {
      const projectManagerContactId = await assertProjectManagerContactExists(
        tx,
        input.projectManagerContactId
      );
      const projectCode = await generateNextBusinessCode(tx, "PROJECT");

      return tx.project.create({
        data: {
          projectCode,
          name: input.name,
          projectTypeId: input.projectTypeId,
          governedStatusId: input.governedStatusId,
          projectManagerContactId,
          startDate: input.startDate,
          reportingCadence: "WEEKLY",
          defaultLanguage: "EN",
          reportLanguageMode: "EN",
          healthStatus: "GREEN",
          isActive: true,
        },
      });
    });

    if (input.templateId) {
      await applyTemplateToProject(project.id, input.templateId);
    }

    revalidatePath("/projects");

    return projectOk(
      input.templateId
        ? "Project created successfully and template applied."
        : "Project created successfully."
    );
  } catch (error) {
    return projectError(
      `Project not added: ${
        error instanceof Error ? error.message : "Unknown database error"
      }`
    );
  }
}

export async function updateProject(formData: FormData) {
  const input = parseProjectHeaderInput(formData);

  try {
    const validationError = validateProjectHeaderInput(input);
    if (validationError) return validationError;

    await prisma.$transaction(async (tx) => {
      const projectManagerContactId = await assertProjectManagerContactExists(
        tx,
        input.projectManagerContactId
      );

      await tx.project.update({
        where: { id: input.id },
        data: {
          name: input.name,
          healthStatus: input.healthStatus,
          reportingCadence: input.reportingCadence,
          governedStatusId: input.governedStatusId,
          projectManagerContactId,
          startDate: input.startDate!,
          plannedStartDate: input.plannedStartDate,
          plannedEndDate: input.plannedEndDate,
          actualStartDate: input.actualStartDate,
          actualEndDate: input.actualEndDate,
          issuerOrganizationId: input.issuerOrganizationId,
          clientOrganizationId: input.clientOrganizationId,
          deliveryOrganizationId: input.deliveryOrganizationId,
          sponsorContactId: input.sponsorContactId,
          showIssuerLogo: input.showIssuerLogo,
          showClientLogo: input.showClientLogo,
          showDeliveryLogo: input.showDeliveryLogo,
        },
      });
    });

    revalidatePath(projectPath(input.id));
    return projectOk("Project updated successfully.");
  } catch (error) {
    return projectError(
      `Project not updated: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id") || "");

  try {
    if (!id) return projectError("Project not deleted: missing project.");

    const existing = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        governedStatusId: true,
        governedStatus: { select: { code: true } },
      },
    });

    if (!existing) return projectError("Project not deleted: it no longer exists.");
    if (!existing.governedStatusId || existing.governedStatus?.code !== "OPEN") {
      return projectError("Project not deleted: only open projects can be deleted.");
    }

    const openUsage = await prisma.statusUsage.findFirst({
      where: {
        statusId: existing.governedStatusId,
        isActive: true,
        status: { code: "OPEN", isActive: true },
        scope: { code: { in: ["DEFAULT", "PROJECT"] } },
      },
    });

    if (!openUsage) {
      return projectError("Project not deleted: only open projects can be deleted.");
    }

    await prisma.project.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/projects");
    return projectOk("Project deactivated successfully.");
  } catch {
    return projectError("Project not deleted: database error.");
  }
}

export async function createProjectWorkstream(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const input = parseProjectWorkstreamInput(formData);

  try {
    if (!projectId) {
      return projectExecutionError("Project workstream not added: missing project.");
    }
    if (!input.workstreamId) {
      return projectExecutionError(
        "Project workstream not added: workstream is required."
      );
    }

    const dateError = validateProjectWorkstreamDates(input, "Project workstream");
    if (dateError) return dateError;

    const workstreamResult = await getActiveWorkstreamForProjectAdd(
      prisma,
      input.workstreamId
    );
    if (!workstreamResult.ok) return workstreamResult.result;

    const duplicateError = await ensureProjectWorkstreamIsNotAssigned(
      prisma,
      projectId,
      input.workstreamId
    );
    if (duplicateError) return duplicateError;

    await prisma.projectWorkstream.create({
      data: {
        projectId,
        workstreamId: input.workstreamId,
        isActive: true,
        customName: input.customName,
        reportingName: input.reportingName,
        objective: input.objective,
        deliverable: input.deliverable,
        visibility: input.visibility,
        plannedStartDate: input.plannedStartDate,
        plannedEndDate: input.plannedEndDate,
        actualStartDate: input.actualStartDate,
        actualEndDate: input.actualEndDate,
        plannedQuantity: input.plannedQuantity,
        actualQuantity: input.actualQuantity,
        measureUnit: input.measureUnit,
        quantityType: input.quantityType,
      },
    });

    revalidateProjectExecution(projectId);
    return projectExecutionOk("Project workstream added successfully.");
  } catch {
    return projectExecutionError("Project workstream not added: database error.");
  }
}

export async function updateProjectWorkstream(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const projectWorkstreamId = String(formData.get("id") || "");
  const input = parseProjectWorkstreamInput(formData);

  try {
    if (!projectId || !projectWorkstreamId) {
      return projectExecutionError("Project workstream not updated: missing record.");
    }

    const dateError = validateProjectWorkstreamDates(input, "Workstream");
    if (dateError) return dateError;

    await prisma.projectWorkstream.update({
      where: { id: projectWorkstreamId },
      data: {
        plannedStartDate: input.plannedStartDate,
        plannedEndDate: input.plannedEndDate,
        actualStartDate: input.actualStartDate,
        actualEndDate: input.actualEndDate,
        customName: input.customName,
        reportingName: input.reportingName,
        objective: input.objective,
        deliverable: input.deliverable,
        visibility: input.visibility,
        plannedQuantity: input.plannedQuantity,
        actualQuantity: input.actualQuantity,
        measureUnit: input.measureUnit,
        quantityType: input.quantityType,
      },
    });

    revalidateProjectExecution(projectId);
    return projectExecutionOk("Project workstream updated successfully.");
  } catch {
    return projectExecutionError("Project workstream not updated: database error.");
  }
}

export async function toggleProjectWorkstream(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const projectWorkstreamId = String(formData.get("id") || "");
  const current = String(formData.get("current") || "") === "true";

  try {
    if (!projectId || !projectWorkstreamId) {
      return projectExecutionError("Project workstream not updated: missing record.");
    }

    const updated = await prisma.projectWorkstream.update({
      where: { id: projectWorkstreamId },
      data: { isActive: !current },
    });

    revalidateProjectExecution(projectId);
    return projectExecutionOk(
      updated.isActive
        ? "Project workstream activated successfully."
        : "Project workstream deactivated successfully."
    );
  } catch {
    return projectExecutionError("Project workstream not updated: database error.");
  }
}

export async function deleteProjectWorkstream(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const projectWorkstreamId = String(formData.get("id") || "");

  try {
    if (!projectId || !projectWorkstreamId) {
      return projectExecutionError("Project workstream not deleted: missing record.");
    }

    const deleteError = await validateProjectWorkstreamCanDelete(
      prisma,
      projectWorkstreamId
    );
    if (deleteError) return deleteError;

    await prisma.projectWorkstream.delete({ where: { id: projectWorkstreamId } });
    revalidateProjectExecution(projectId);
    return projectExecutionOk("Project workstream deleted successfully.");
  } catch {
    return projectExecutionError("Project workstream not deleted: database error.");
  }
}

export async function createProjectTask(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const input = parseProjectTaskInput(formData);

  try {
    if (!projectId || !input.projectWorkstreamId || !input.name) {
      return projectExecutionError(
        "Task not added: workstream and name are required."
      );
    }

    const dateError = validateProjectTaskDates(input);
    if (dateError) return dateError;

    const projectWorkstreamResult = await getProjectWorkstreamInProject(
      prisma,
      projectId,
      input.projectWorkstreamId,
      "Task"
    );
    if (!projectWorkstreamResult.ok) return projectWorkstreamResult.result;

    const sortOrder = await getNextProjectTaskSortOrder(
      prisma,
      input.projectWorkstreamId,
      null
    );

    await prisma.projectTask.create({
      data: {
        projectWorkstreamId: input.projectWorkstreamId,
        parentTaskId: null,
        name: input.name,
        sortOrder,
        description: input.description,
        reportingName: input.reportingName,
        visibility: input.visibility,
        plannedStartDate: input.plannedStartDate,
        plannedEndDate: input.plannedEndDate,
        actualStartDate: input.actualStartDate,
        actualEndDate: input.actualEndDate,
      },
    });

    revalidateProjectExecution(projectId);
    return projectExecutionOk("Task added successfully.");
  } catch {
    return projectExecutionError("Task not added: database error.");
  }
}

export async function createSubtask(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const input = parseProjectTaskInput(formData);

  try {
    if (!projectId || !input.projectWorkstreamId || !input.parentTaskId || !input.name) {
      return projectExecutionError(
        "Subtask not added: workstream, parent task, and name are required."
      );
    }

    const dateError = validateProjectTaskDates(input);
    if (dateError) return dateError;

    const projectWorkstreamResult = await getProjectWorkstreamInProject(
      prisma,
      projectId,
      input.projectWorkstreamId,
      "Subtask"
    );
    if (!projectWorkstreamResult.ok) return projectWorkstreamResult.result;

    const parentError = await validateSubtaskParent(prisma, input);
    if (parentError) return parentError;

    const sortOrder = await getNextProjectTaskSortOrder(
      prisma,
      input.projectWorkstreamId,
      input.parentTaskId
    );

    await prisma.projectTask.create({
      data: {
        projectWorkstreamId: input.projectWorkstreamId,
        parentTaskId: input.parentTaskId,
        name: input.name,
        sortOrder,
        visibility: input.visibility,
        plannedStartDate: input.plannedStartDate,
        plannedEndDate: input.plannedEndDate,
        actualStartDate: input.actualStartDate,
        actualEndDate: input.actualEndDate,
      },
    });

    revalidateProjectExecution(projectId);
    return projectExecutionOk("Subtask added successfully.");
  } catch {
    return projectExecutionError("Subtask not added: database error.");
  }
}

export async function updateProjectTask(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const taskId = String(formData.get("id") || "");
  const input = parseProjectTaskInput(formData);

  try {
    if (!projectId || !taskId || !input.name) {
      return projectExecutionError("Task not updated: task and name are required.");
    }

    const dateError = validateProjectTaskDates(input);
    if (dateError) return dateError;

    const taskError = await validateProjectTaskForUpdate(prisma, taskId);
    if (taskError) return taskError;

    await prisma.projectTask.update({
      where: { id: taskId },
      data: {
        name: input.name,
        sortOrder: input.sortOrder ?? 100,
        description: input.description,
        reportingName: input.reportingName,
        visibility: input.visibility,
        plannedStartDate: input.plannedStartDate,
        plannedEndDate: input.plannedEndDate,
        actualStartDate: input.actualStartDate,
        actualEndDate: input.actualEndDate,
      },
    });

    revalidateProjectExecution(projectId);
    return projectExecutionOk("Task updated successfully.");
  } catch {
    return projectExecutionError("Task not updated: database error.");
  }
}

export async function deleteProjectTask(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const taskId = String(formData.get("id") || "");

  try {
    if (!projectId || !taskId) {
      return projectExecutionError("Task not deleted: missing record.");
    }

    const taskResult = await getProjectTaskForDelete(prisma, taskId);
    if (!taskResult.ok) return taskResult.result;

    if (!taskResult.value.parentTaskId) {
      await prisma.projectTask.deleteMany({ where: { parentTaskId: taskId } });
    }

    await prisma.projectTask.delete({ where: { id: taskId } });
    revalidateProjectExecution(projectId);
    return projectExecutionOk("Task deleted successfully.");
  } catch {
    return projectExecutionError("Task not deleted: database error.");
  }
}

export async function createProjectEvent(formData: FormData) {
  const input = parseProjectEventInput(formData);

  try {
    if (!input.projectId || !input.eventTypeId || !input.eventDate) {
      return projectExecutionError(
        "Milestone not added: event type and date are required."
      );
    }

    const linkedWorkstreamError = await validateLinkedProjectWorkstream(
      prisma,
      input.projectId,
      input.linkedProjectWorkstreamId
    );
    if (linkedWorkstreamError) return linkedWorkstreamError;

    const eventTypeResult = await getActiveEventTypeForProjectEvent(
      prisma,
      input.eventTypeId
    );
    if (!eventTypeResult.ok) return eventTypeResult.result;

    await prisma.projectEvent.create({
      data: {
        projectId: input.projectId,
        eventTypeId: input.eventTypeId,
        name: eventTypeResult.value.name,
        eventDate: input.eventDate,
        isActive: true,
        linkedProjectWorkstreamId: input.linkedProjectWorkstreamId,
        customName: input.customName,
        reportingName: input.reportingName,
        description: input.description,
        visibility: input.visibility,
        plannedQuantity: input.plannedQuantity,
        actualQuantity: input.actualQuantity,
        measureUnit: input.measureUnit,
        quantityType: input.quantityType,
        isCompleted: input.isCompleted,
        completionDate: input.completionDate,
      },
    });

    revalidateProjectExecution(input.projectId);
    return projectExecutionOk("Milestone added successfully.");
  } catch {
    return projectExecutionError("Milestone not added: database error.");
  }
}

export async function updateProjectEvent(formData: FormData) {
  const eventId = String(formData.get("id") || "");
  const projectId = String(formData.get("projectId") || "");
  const input = parseProjectEventInput(formData);

  try {
    if (!eventId || !projectId) {
      return projectExecutionError("Milestone not updated: missing record.");
    }
    if (!input.eventDate) {
      return projectExecutionError("Milestone not updated: event date is required.");
    }

    const linkedWorkstreamError = await validateLinkedProjectWorkstream(
      prisma,
      projectId,
      input.linkedProjectWorkstreamId
    );
    if (linkedWorkstreamError) return linkedWorkstreamError;

    await prisma.projectEvent.update({
      where: { id: eventId },
      data: {
        eventDate: input.eventDate,
        customName: input.customName,
        reportingName: input.reportingName,
        description: input.description,
        visibility: input.visibility,
        linkedProjectWorkstreamId: input.linkedProjectWorkstreamId,
        plannedQuantity: input.plannedQuantity,
        actualQuantity: input.actualQuantity,
        measureUnit: input.measureUnit,
        quantityType: input.quantityType,
        isCompleted: input.isCompleted,
        completionDate: input.completionDate,
      },
    });

    revalidateProjectExecution(projectId);
    return projectExecutionOk("Milestone updated successfully.");
  } catch {
    return projectExecutionError("Milestone not updated: database error.");
  }
}

export async function toggleProjectEvent(formData: FormData) {
  const eventId = String(formData.get("id") || "");
  const projectId = String(formData.get("projectId") || "");
  const current = String(formData.get("current") || "") === "true";

  try {
    if (!eventId || !projectId) {
      return projectExecutionError("Milestone not updated: missing record.");
    }

    const updated = await prisma.projectEvent.update({
      where: { id: eventId },
      data: { isActive: !current },
    });

    revalidateProjectExecution(projectId);
    return projectExecutionOk(
      updated.isActive
        ? "Milestone activated successfully."
        : "Milestone deactivated successfully."
    );
  } catch {
    return projectExecutionError("Milestone not updated: database error.");
  }
}

export async function deleteProjectEvent(formData: FormData) {
  const eventId = String(formData.get("id") || "");
  const projectId = String(formData.get("projectId") || "");

  try {
    if (!eventId || !projectId) {
      return projectExecutionError("Milestone not deleted: missing record.");
    }

    await prisma.projectEvent.delete({ where: { id: eventId } });
    revalidateProjectExecution(projectId);
    return projectExecutionOk("Milestone deleted successfully.");
  } catch {
    return projectExecutionError("Milestone not deleted: database error.");
  }
}
