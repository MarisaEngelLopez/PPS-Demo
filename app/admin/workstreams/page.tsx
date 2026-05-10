import { MainNav } from "@/components/MainNav";
import { WorkstreamsTable } from "@/components/admin/WorkstreamsTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function createWorkstream(formData: FormData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const phaseId = String(formData.get("phaseId") || "");
  const sortOrder = Number(formData.get("sortOrder") || 0);

  try {
    if (!name || !phaseId) {
      return {
        ok: false,
        message: "Workstream not added: name and phase are required.",
      };
    }

    const existing = await prisma.workstream.findFirst({
      where: {
        name,
        phaseId,
      },
    });

    if (existing) {
      return {
        ok: false,
        message: "Workstream not added: already exists in this phase.",
      };
    }

    await prisma.workstream.create({
      data: {
        name,
        phaseId,
        sortOrder,
        isActive: true,
      },
    });

    revalidatePath("/admin/workstreams");

    return {
      ok: true,
      message: "Workstream created successfully.",
    };
  } catch (e) {
    console.error("Create workstream error:", e);

    return {
      ok: false,
      message: "Workstream not added: database error.",
    };
  }
}

async function toggleWorkstream(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const current = String(formData.get("current")) === "true";

  try {
    const updated = await prisma.workstream.update({
      where: { id },
      data: {
        isActive: !current,
      },
    });

    revalidatePath("/admin/workstreams");

    return {
      ok: true,
      message: updated.isActive
        ? "Workstream activated successfully."
        : "Workstream deactivated successfully.",
    };
  } catch (e) {
    console.error("Toggle workstream error:", e);

    return {
      ok: false,
      message: "Workstream not updated: database error.",
    };
  }
}

async function deleteWorkstream(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));

  try {
    const existing = await prisma.workstream.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        ok: false,
        message: "Workstream not deleted: it no longer exists.",
      };
    }

    if (existing.isActive) {
      return {
        ok: false,
        message: "Workstream not deleted: active workstreams cannot be deleted.",
      };
    }

    const usedInProjectWorkstream = await prisma.projectWorkstream.findFirst({
      where: { workstreamId: id },
    });

    if (usedInProjectWorkstream) {
      return {
        ok: false,
        message: "Workstream not deleted: it has been used in projects.",
      };
    }

    await prisma.workstream.delete({
      where: { id },
    });

    revalidatePath("/admin/workstreams");

    return {
      ok: true,
      message: "Workstream deleted successfully.",
    };
  } catch (e) {
    console.error("Delete workstream error:", e);

    return {
      ok: false,
      message: "Workstream not deleted: database error.",
    };
  }
}

export default async function WorkstreamsPage() {
  const [workstreams, phases] = await Promise.all([
    prisma.workstream.findMany({
      include: {
        phase: true,
      },
      orderBy: [
        { phase: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    }),
    prisma.phase.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>Workstreams</h1>

      <WorkstreamsTable
        workstreams={workstreams}
        phases={phases}
        createWorkstream={createWorkstream}
        toggleWorkstream={toggleWorkstream}
        deleteWorkstream={deleteWorkstream}
      />
    </main>
  );
}