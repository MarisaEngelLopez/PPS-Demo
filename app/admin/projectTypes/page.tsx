import { MainNav } from "@/components/MainNav";
import { ProjectTypesTable } from "@/components/admin/ProjectTypesTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function createProjectType(formData: FormData) {
  "use server";

  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const sortOrder = Number(formData.get("sortOrder") || 0);

  try {
    if (!code || !name) {
      return {
        ok: false,
        message: "Project type not added: code and name are required.",
      };
    }

    const existing = await prisma.projectType.findFirst({
      where: { code },
    });

    if (existing) {
      return {
        ok: false,
        message: "Project type not added: already exists in database.",
      };
    }

    await prisma.projectType.create({
      data: {
        code,
        name,
        description: description || null,
        sortOrder,
        isActive: true,
      },
    });

    revalidatePath("/admin/project-types");

    return {
      ok: true,
      message: "Project type created successfully.",
    };
  } catch (e) {
    console.error("Create project type error:", e);

    return {
      ok: false,
      message: "Project type not added: database error.",
    };
  }
}

async function toggleProjectType(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const current = String(formData.get("current")) === "true";

  try {
    const updated = await prisma.projectType.update({
      where: { id },
      data: {
        isActive: !current,
      },
    });

    revalidatePath("/admin/project-types");

    return {
      ok: true,
      message: updated.isActive
        ? "Project type activated successfully."
        : "Project type deactivated successfully.",
    };
  } catch (e) {
    console.error("Toggle project type error:", e);

    return {
      ok: false,
      message: "Project type not updated: database error.",
    };
  }
}

async function deleteProjectType(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));

  try {
    const existing = await prisma.projectType.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        ok: false,
        message: "Project type not deleted: it no longer exists.",
      };
    }

    if (existing.isActive) {
      return {
        ok: false,
        message: "Project type not deleted: active project types cannot be deleted.",
      };
    }

    const usedInProject = await prisma.project.findFirst({
      where: { projectTypeId: id },
    });

    if (usedInProject) {
      return {
        ok: false,
        message: "Project type not deleted: it has been used in projects.",
      };
    }

    await prisma.projectType.delete({
      where: { id },
    });

    revalidatePath("/admin/project-types");

    return {
      ok: true,
      message: "Project type deleted successfully.",
    };
  } catch (e) {
    console.error("Delete project type error:", e);

    return {
      ok: false,
      message: "Project type not deleted: database error.",
    };
  }
}

export default async function ProjectTypesPage() {
  const projectTypes = await prisma.projectType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>Project Types</h1>

      <ProjectTypesTable
        projectTypes={projectTypes}
        createProjectType={createProjectType}
        toggleProjectType={toggleProjectType}
        deleteProjectType={deleteProjectType}
      />
    </main>
  );
}