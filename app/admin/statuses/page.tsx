import { MainNav } from "@/components/MainNav";
import { ProjectStatusesTable } from "@/components/admin/ProjectStatusesTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function createStatus(formData: FormData) {
  "use server";

  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const nameEs = String(formData.get("nameEs") || "").trim();
  const sortOrder = Number(formData.get("sortOrder") || 100);

  try {
    if (!code || !name) {
      return {
        ok: false,
        message: "Status not added: code and name are required.",
      };
    }

    const existing = await prisma.projectStatus.findFirst({
      where: { code },
    });

    if (existing) {
      return {
        ok: false,
        message: "Status not added: already exists in database.",
      };
    }

    await prisma.projectStatus.create({
      data: {
        code,
        name,
        nameEs: nameEs || null,
        sortOrder,
        isActive: true,
      },
    });

    revalidatePath("/admin/statuses");

    return {
      ok: true,
      message: "Status created successfully.",
    };
  } catch (e) {
    console.error("Create status error:", e);

    return {
      ok: false,
      message: "Status not added: database error.",
    };
  }
}

async function toggleActive(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const current = String(formData.get("current")) === "true";

  try {
    const updated = await prisma.projectStatus.update({
      where: { id },
      data: { isActive: !current },
    });

    revalidatePath("/admin/statuses");

    return {
      ok: true,
      message: updated.isActive
        ? "Status activated successfully."
        : "Status deactivated successfully.",
    };
  } catch (e) {
    console.error("Toggle status error:", e);

    return {
      ok: false,
      message: "Status not updated: database error.",
    };
  }
}

async function deleteStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));

  try {
    const existing = await prisma.projectStatus.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        ok: false,
        message: "Status not deleted: it no longer exists.",
      };
    }

    if (existing.isActive) {
      return {
        ok: false,
        message: "Status not deleted: active statuses cannot be deleted.",
      };
    }

    const usedInProject = await prisma.project.findFirst({
      where: { statusId: id },
    });

    if (usedInProject) {
      return {
        ok: false,
        message: "Status not deleted: it has been used in projects.",
      };
    }

    await prisma.projectStatus.delete({
      where: { id },
    });

    revalidatePath("/admin/statuses");

    return {
      ok: true,
      message: "Status deleted successfully.",
    };
  } catch (e) {
    console.error("Delete status error:", e);

    return {
      ok: false,
      message: "Status not deleted: database error.",
    };
  }
}

export default async function ProjectStatusesPage() {
  const statuses = await prisma.projectStatus.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>Project Statuses</h1>

      <ProjectStatusesTable
        statuses={statuses}
        createStatus={createStatus}
        toggleActive={toggleActive}
        deleteStatus={deleteStatus}
      />
    </main>
  );
}