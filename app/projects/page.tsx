import { MainNav } from "@/components/MainNav";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { prisma } from "@/lib/prisma";
import { applyTemplateToProject } from "@/lib/actions/projectTemplates";
import { revalidatePath } from "next/cache";

async function createProject(formData: FormData) {
  "use server";

  const projectCode = String(formData.get("projectCode") || "")
    .trim()
    .toUpperCase();
  const name = String(formData.get("name") || "").trim();

  const projectTypeIdRaw = String(formData.get("projectTypeId") || "");
  const projectTypeId = projectTypeIdRaw ? projectTypeIdRaw : null;

  const statusId = String(formData.get("statusId") || "");
  const projectManagerId = String(formData.get("projectManagerId") || "");
  const templateId = String(formData.get("templateId") || "");

  const startDateRaw = String(formData.get("startDate") || "");
  const startDate = startDateRaw ? new Date(startDateRaw) : new Date();

  try {
    if (!projectCode || !name || !statusId || !projectManagerId) {
      return {
        ok: false,
        message:
          "Project not added: code, name, status and project manager are required.",
      };
    }

    const existing = await prisma.project.findUnique({
      where: { projectCode },
    });

    if (existing) {
      return {
        ok: false,
        message: "Project not added: project code already exists.",
      };
    }

    const project = await prisma.project.create({
      data: {
        projectCode,
        name,
        projectTypeId,
        statusId,
        projectManagerId,
        startDate,
        reportingCadence: "WEEKLY",
        defaultLanguage: "EN",
        reportLanguageMode: "EN",
        healthStatus: "GREEN",
        isActive: true,
      },
    });

    if (templateId) {
      await applyTemplateToProject(project.id, templateId);
    }

    revalidatePath("/projects");

    return {
      ok: true,
      message: templateId
        ? "Project created successfully and template applied."
        : "Project created successfully.",
    };
  } catch (e) {
    console.error("Create project error:", e);

    return {
      ok: false,
      message: "Project not added: database error.",
    };
  }
}

async function deleteProject(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");

  try {
    if (!id) {
      return {
        ok: false,
        message: "Project not deleted: missing project.",
      };
    }

    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        ok: false,
        message: "Project not deleted: it no longer exists.",
      };
    }

    await prisma.project.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/projects");

    return {
      ok: true,
      message: "Project deactivated successfully.",
    };
  } catch (e) {
    console.error("Delete project error:", e);

    return {
      ok: false,
      message: "Project not deleted: database error.",
    };
  }
}

export default async function ProjectsPage() {
  const [projects, projectTypes, statuses, users, templates] =
    await Promise.all([
      prisma.project.findMany({
        where: { isActive: true },
        include: {
          projectType: true,
          status: true,
          projectManager: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.projectType.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),

      prisma.projectStatus.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),

      prisma.user.findMany({
        orderBy: { fullName: "asc" },
      }),

      prisma.projectTemplate.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

  return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>Projects</h1>

      <ProjectsTable
        projects={projects}
        projectTypes={projectTypes}
        statuses={statuses}
        users={users}
        templates={templates}
        createProject={createProject}
        deleteProject={deleteProject}
      />
    </main>
  );
}