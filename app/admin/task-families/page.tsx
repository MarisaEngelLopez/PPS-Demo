import { TaskFamiliesTable } from "@/components/admin/TaskFamiliesTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { translate } from "@/lib/i18n/dictionaries";
import { getTaskFamilyAdminRows } from "@/lib/domain/taskFamilies/taskFamilyQueries";
import {
  parseTaskFamilyInput,
  taskFamilyError,
  taskFamilyOk,
  validateTaskFamilyInput,
} from "@/lib/domain/taskFamilies/taskFamilyValidation";
import { prisma } from "@/lib/prisma";
import { getServerLocale } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";

const TASK_FAMILIES_PATH = "/admin/task-families";

async function createTaskFamily(formData: FormData) {
  "use server";

  const input = parseTaskFamilyInput(formData);

  try {
    const validation = await validateTaskFamilyInput(input);
    if (validation) return validation;

    await prisma.taskFamily.create({
      data: {
        ...input,
        isActive: true,
      },
    });

    revalidatePath(TASK_FAMILIES_PATH);

    return taskFamilyOk("Task family created successfully.");
  } catch (e) {
    console.error("Create task family error:", e);

    return taskFamilyError("Task family not added: database error.");
  }
}

async function updateTaskFamily(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const input = parseTaskFamilyInput(formData);

  try {
    if (!id) return taskFamilyError("Task family not updated: missing id.");

    const validation = await validateTaskFamilyInput(input, id);
    if (validation) return validation;

    await prisma.taskFamily.update({
      where: { id },
      data: input,
    });

    revalidatePath(TASK_FAMILIES_PATH);

    return taskFamilyOk("Task family updated successfully.");
  } catch (e) {
    console.error("Update task family error:", e);

    return taskFamilyError("Task family not updated: database error.");
  }
}

async function toggleTaskFamily(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const current = String(formData.get("current")) === "true";

  try {
    const existing = await prisma.taskFamily.findUnique({
      where: { id },
    });

    if (!existing) {
      return taskFamilyError("Task family not updated: it no longer exists.");
    }

    const updated = await prisma.taskFamily.update({
      where: { id },
      data: {
        isActive: !current,
      },
    });

    revalidatePath(TASK_FAMILIES_PATH);

    return taskFamilyOk(
      updated.isActive
        ? "Task family activated successfully."
        : "Task family deactivated successfully."
    );
  } catch (e) {
    console.error("Toggle task family error:", e);

    return taskFamilyError("Task family not updated: database error.");
  }
}

async function deleteTaskFamily(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));

  try {
    const existing = await prisma.taskFamily.findUnique({
      where: { id },
    });

    if (!existing) {
      return taskFamilyError("Task family not deleted: it no longer exists.");
    }

    if (existing.isActive) {
      return taskFamilyError("Task family not deleted: deactivate it first.");
    }

    const timeEntryCount = await prisma.timeEntry.count({
      where: { taskFamilyId: id },
    });

    if (timeEntryCount > 0) {
      return taskFamilyError(
        "Task family not deleted: it is already used by time entries."
      );
    }

    await prisma.taskFamily.delete({
      where: { id },
    });

    revalidatePath(TASK_FAMILIES_PATH);

    return taskFamilyOk("Task family deleted successfully.");
  } catch (e) {
    console.error("Delete task family error:", e);

    return taskFamilyError("Task family not deleted: database error.");
  }
}

export default async function TaskFamiliesPage() {
  const [locale, taskFamilies] = await Promise.all([
    getServerLocale(),
    getTaskFamilyAdminRows(),
  ]);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "admin.taskFamilies.title")}</h1>

      <TaskFamiliesTable
        taskFamilies={taskFamilies}
        createTaskFamily={createTaskFamily}
        updateTaskFamily={updateTaskFamily}
        toggleTaskFamily={toggleTaskFamily}
        deleteTaskFamily={deleteTaskFamily}
      />
    </main>
  );
}
