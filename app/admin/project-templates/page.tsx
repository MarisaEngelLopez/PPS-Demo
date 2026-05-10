// app/admin/project-templates/page.tsx

import { MainNav } from "@/components/MainNav";
import { ProjectTemplatesTable } from "@/components/admin/ProjectTemplatesTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function createProjectTemplate(formData: FormData) {
  "use server";

  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();

  try {
    if (!code || !name) {
      return {
        ok: false,
        message: "Project template not added: code and name are required.",
      };
    }

    const existing = await prisma.projectTemplate.findFirst({
      where: { code },
    });

    if (existing) {
      return {
        ok: false,
        message: "Project template not added: already exists in database.",
      };
    }

    await prisma.projectTemplate.create({
      data: {
        code,
        name,
        isActive: true,
      },
    });

    revalidatePath("/admin/project-templates");

    return {
      ok: true,
      message: "Project template created successfully.",
    };
  } catch (e) {
    console.error("Create project template error:", e);

    return {
      ok: false,
      message: "Project template not added: database error.",
    };
  }
}

async function toggleProjectTemplate(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const current = String(formData.get("current")) === "true";

  try {
    const updated = await prisma.projectTemplate.update({
      where: { id },
      data: { isActive: !current },
    });

    revalidatePath("/admin/project-templates");

    return {
      ok: true,
      message: updated.isActive
        ? "Project template activated successfully."
        : "Project template deactivated successfully.",
    };
  } catch (e) {
    console.error("Toggle project template error:", e);

    return {
      ok: false,
      message: "Project template not updated: database error.",
    };
  }
}

async function deleteProjectTemplate(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));

  try {
    const existing = await prisma.projectTemplate.findUnique({
      where: { id },
      include: {
        templateWorkstreams: true,
      },
    });

    if (!existing) {
      return {
        ok: false,
        message: "Project template not deleted: it no longer exists.",
      };
    }

    if (existing.isActive) {
      return {
        ok: false,
        message:
          "Project template not deleted: active templates cannot be deleted.",
      };
    }

    if (existing.templateWorkstreams.length > 0) {
      return {
        ok: false,
        message:
          "Project template not deleted: it has configured workstreams.",
      };
    }

    await prisma.projectTemplate.delete({
      where: { id },
    });

    revalidatePath("/admin/project-templates");

    return {
      ok: true,
      message: "Project template deleted successfully.",
    };
  } catch (e) {
    console.error("Delete project template error:", e);

    return {
      ok: false,
      message: "Project template not deleted: database error.",
    };
  }
}

export default async function ProjectTemplatesPage() {
  const templates = await prisma.projectTemplate.findMany({
    include: {
      templateWorkstreams: {
        include: {
          workstream: {
            include: {
              phase: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>Project Templates</h1>

      <ProjectTemplatesTable
        templates={templates}
        createProjectTemplate={createProjectTemplate}
        toggleProjectTemplate={toggleProjectTemplate}
        deleteProjectTemplate={deleteProjectTemplate}
      />
    </main>
  );
}