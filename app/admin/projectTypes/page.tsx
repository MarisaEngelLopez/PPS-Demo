import { ProjectTypesTable } from "@/components/admin/ProjectTypesTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { getProjectTypeAdminRows } from "@/lib/domain/projectTypes/projectTypeQueries";
import { translate } from "@/lib/i18n/dictionaries";
import {
  parseProjectTypeInput,
  projectTypeError,
  projectTypeOk,
  validateProjectTypeInput,
} from "@/lib/domain/projectTypes/projectTypeValidation";
import { prisma } from "@/lib/prisma";
import { getServerLocale } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";

const PROJECT_TYPES_PATH = "/admin/projectTypes";

async function createProjectType(formData: FormData) {
  "use server";

  const input = parseProjectTypeInput(formData);

  try {
    const validation = await validateProjectTypeInput(input);
    if (validation) return validation;

    await prisma.projectType.create({
      data: {
        ...input,
        isActive: true,
      },
    });

    revalidatePath(PROJECT_TYPES_PATH);

    return projectTypeOk("Project type created successfully.");
  } catch (e) {
    console.error("Create project type error:", e);

    return projectTypeError("Project type not added: database error.");
  }
}

async function updateProjectType(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const input = parseProjectTypeInput(formData);

  try {
    if (!id) return projectTypeError("Project type not updated: missing id.");

    const validation = await validateProjectTypeInput(input, id);
    if (validation) return validation;

    await prisma.projectType.update({
      where: { id },
      data: input,
    });

    revalidatePath(PROJECT_TYPES_PATH);

    return projectTypeOk("Project type updated successfully.");
  } catch (e) {
    console.error("Update project type error:", e);

    return projectTypeError("Project type not updated: database error.");
  }
}

async function toggleProjectType(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const current = String(formData.get("current")) === "true";

  try {
    const existing = await prisma.projectType.findUnique({
      where: { id },
    });

    if (!existing) {
      return projectTypeError("Project type not updated: it no longer exists.");
    }

    const updated = await prisma.projectType.update({
      where: { id },
      data: {
        isActive: !current,
      },
    });

    revalidatePath(PROJECT_TYPES_PATH);

    return projectTypeOk(
      updated.isActive
        ? "Project type activated successfully."
        : "Project type deactivated successfully."
    );
  } catch (e) {
    console.error("Toggle project type error:", e);

    return projectTypeError("Project type not updated: database error.");
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
      return projectTypeError("Project type not deleted: it no longer exists.");
    }

    if (existing.isActive) {
      return projectTypeError("Project type not deleted: deactivate it first.");
    }

    const projectCount = await prisma.project.count({
      where: { projectTypeId: id },
    });

    if (projectCount > 0) {
      return projectTypeError(
        "Project type not deleted: it is already used by projects."
      );
    }

    await prisma.projectType.delete({
      where: { id },
    });

    revalidatePath(PROJECT_TYPES_PATH);

    return projectTypeOk("Project type deleted successfully.");
  } catch (e) {
    console.error("Delete project type error:", e);

    return projectTypeError("Project type not deleted: database error.");
  }
}

export default async function ProjectTypesPage() {
  const [locale, projectTypes] = await Promise.all([
    getServerLocale(),
    getProjectTypeAdminRows(),
  ]);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "admin.projectTypes.title")}</h1>

      <ProjectTypesTable
        projectTypes={projectTypes}
        createProjectType={createProjectType}
        updateProjectType={updateProjectType}
        toggleProjectType={toggleProjectType}
        deleteProjectType={deleteProjectType}
      />
    </main>
  );
}
