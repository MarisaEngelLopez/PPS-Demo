import { ProjectTemplatesTable } from "@/components/admin/ProjectTemplatesTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { getProjectTemplateAdminRows } from "@/lib/domain/projectTemplates/projectTemplateQueries";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import {
  parseProjectTemplateInput,
  projectTemplateError,
  projectTemplateOk,
  validateProjectTemplateInput,
} from "@/lib/domain/projectTemplates/projectTemplateValidation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const PROJECT_TEMPLATES_PATH = "/admin/project-templates";

async function createProjectTemplate(formData: FormData) {
  "use server";

  const input = parseProjectTemplateInput(formData);

  try {
    const validation = await validateProjectTemplateInput(input);
    if (validation) return validation;

    await prisma.projectTemplate.create({
      data: {
        ...input,
        isActive: true,
      },
    });

    revalidatePath(PROJECT_TEMPLATES_PATH);

    return projectTemplateOk("Project template created successfully.");
  } catch (e) {
    console.error("Create project template error:", e);

    return projectTemplateError("Project template not added: database error.");
  }
}

async function updateProjectTemplate(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const input = parseProjectTemplateInput(formData);

  try {
    if (!id) return projectTemplateError("Project template not updated: missing id.");

    const validation = await validateProjectTemplateInput(input, id);
    if (validation) return validation;

    await prisma.projectTemplate.update({
      where: { id },
      data: input,
    });

    revalidatePath(PROJECT_TEMPLATES_PATH);

    return projectTemplateOk("Project template updated successfully.");
  } catch (e) {
    console.error("Update project template error:", e);

    return projectTemplateError("Project template not updated: database error.");
  }
}

async function toggleProjectTemplate(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const current = String(formData.get("current")) === "true";

  try {
    const existing = await prisma.projectTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return projectTemplateError("Project template not updated: it no longer exists.");
    }

    const updated = await prisma.projectTemplate.update({
      where: { id },
      data: { isActive: !current },
    });

    revalidatePath(PROJECT_TEMPLATES_PATH);

    return projectTemplateOk(
      updated.isActive
        ? "Project template activated successfully."
        : "Project template deactivated successfully."
    );
  } catch (e) {
    console.error("Toggle project template error:", e);

    return projectTemplateError("Project template not updated: database error.");
  }
}

async function deleteProjectTemplate(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));

  try {
    const existing = await prisma.projectTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return projectTemplateError("Project template not deleted: it no longer exists.");
    }

    if (existing.isActive) {
      return projectTemplateError("Project template not deleted: deactivate it first.");
    }

    const workstreamCount = await prisma.templateWorkstream.count({
      where: { templateId: id },
    });

    if (workstreamCount > 0) {
      return projectTemplateError(
        "Project template not deleted: it has configured workstreams."
      );
    }

    await prisma.projectTemplate.delete({
      where: { id },
    });

    revalidatePath(PROJECT_TEMPLATES_PATH);

    return projectTemplateOk("Project template deleted successfully.");
  } catch (e) {
    console.error("Delete project template error:", e);

    return projectTemplateError("Project template not deleted: database error.");
  }
}

export default async function ProjectTemplatesPage() {
  const [locale, templates] = await Promise.all([
    getServerLocale(),
    getProjectTemplateAdminRows(),
  ]);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "admin.projectTemplates.title")}</h1>

      <ProjectTemplatesTable
        templates={templates}
        createProjectTemplate={createProjectTemplate}
        updateProjectTemplate={updateProjectTemplate}
        toggleProjectTemplate={toggleProjectTemplate}
        deleteProjectTemplate={deleteProjectTemplate}
      />
    </main>
  );
}
