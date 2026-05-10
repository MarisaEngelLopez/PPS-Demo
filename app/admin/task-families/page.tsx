import { MainNav } from "@/components/MainNav";
import { TaskFamiliesTable } from "@/components/admin/TaskFamiliesTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function createTaskFamily(formData: FormData) {
  "use server";

  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const sortOrder = Number(formData.get("sortOrder") || 0);

  try {
    if (!code || !name) {
      return {
        ok: false,
        message: "Task family not added: code and name are required.",
      };
    }

    const existing = await prisma.taskFamily.findFirst({
      where: { code },
    });

    if (existing) {
      return {
        ok: false,
        message: "Task family not added: already exists in database.",
      };
    }

    await prisma.taskFamily.create({
      data: {
        code,
        name,
        sortOrder,
        isActive: true,
      },
    });

    revalidatePath("/admin/task-families");

    return {
      ok: true,
      message: "Task family created successfully.",
    };
  } catch (e) {
    console.error("Create task family error:", e);

    return {
      ok: false,
      message: "Task family not added: database error.",
    };
  }
}

async function toggleTaskFamily(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const current = String(formData.get("current")) === "true";

  try {
    const updated = await prisma.taskFamily.update({
      where: { id },
      data: {
        isActive: !current,
      },
    });

    revalidatePath("/admin/task-families");

    return {
      ok: true,
      message: updated.isActive
        ? "Task family activated successfully."
        : "Task family deactivated successfully.",
    };
  } catch (e) {
    console.error("Toggle task family error:", e);

    return {
      ok: false,
      message: "Task family not updated: database error.",
    };
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
      return {
        ok: false,
        message: "Task family not deleted: it no longer exists.",
      };
    }

    if (existing.isActive) {
      return {
        ok: false,
        message: "Task family not deleted: active task families cannot be deleted.",
      };
    }

    // Future-proof dependency check.
    // Add concrete checks here once TaskFamily is linked to TimeEntry/Task records.

    await prisma.taskFamily.delete({
      where: { id },
    });

    revalidatePath("/admin/task-families");

    return {
      ok: true,
      message: "Task family deleted successfully.",
    };
  } catch (e) {
    console.error("Delete task family error:", e);

    return {
      ok: false,
      message: "Task family not deleted: database error.",
    };
  }
}

export default async function TaskFamiliesPage() {
  const taskFamilies = await prisma.taskFamily.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>Task Families</h1>

      <TaskFamiliesTable
        taskFamilies={taskFamilies}
        createTaskFamily={createTaskFamily}
        toggleTaskFamily={toggleTaskFamily}
        deleteTaskFamily={deleteTaskFamily}
      />
    </main>
  );
}