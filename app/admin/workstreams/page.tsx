import { WorkstreamsTable } from "@/components/admin/WorkstreamsTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import {
  getActivePhaseOptions,
  getWorkstreamAdminRows,
} from "@/lib/domain/workstreams/workstreamQueries";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import {
  parseWorkstreamInput,
  validateWorkstreamInput,
  workstreamError,
  workstreamOk,
} from "@/lib/domain/workstreams/workstreamValidation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const WORKSTREAMS_PATH = "/admin/workstreams";

async function createWorkstream(formData: FormData) {
  "use server";

  const input = parseWorkstreamInput(formData);

  try {
    const validation = await validateWorkstreamInput(input);
    if (validation) return validation;

    await prisma.workstream.create({
      data: {
        ...input,
        isActive: true,
      },
    });

    revalidatePath(WORKSTREAMS_PATH);

    return workstreamOk("Workstream created successfully.");
  } catch (e) {
    console.error("Create workstream error:", e);

    return workstreamError("Workstream not added: database error.");
  }
}

async function updateWorkstream(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const input = parseWorkstreamInput(formData);

  try {
    if (!id) return workstreamError("Workstream not updated: missing id.");

    const validation = await validateWorkstreamInput(input, id);
    if (validation) return validation;

    await prisma.workstream.update({
      where: { id },
      data: input,
    });

    revalidatePath(WORKSTREAMS_PATH);

    return workstreamOk("Workstream updated successfully.");
  } catch (e) {
    console.error("Update workstream error:", e);

    return workstreamError("Workstream not updated: database error.");
  }
}

async function toggleWorkstream(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const current = String(formData.get("current")) === "true";

  try {
    const existing = await prisma.workstream.findUnique({
      where: { id },
    });

    if (!existing) {
      return workstreamError("Workstream not updated: it no longer exists.");
    }

    const updated = await prisma.workstream.update({
      where: { id },
      data: {
        isActive: !current,
      },
    });

    revalidatePath(WORKSTREAMS_PATH);

    return workstreamOk(
      updated.isActive
        ? "Workstream activated successfully."
        : "Workstream deactivated successfully."
    );
  } catch (e) {
    console.error("Toggle workstream error:", e);

    return workstreamError("Workstream not updated: database error.");
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
      return workstreamError("Workstream not deleted: it no longer exists.");
    }

    if (existing.isActive) {
      return workstreamError("Workstream not deleted: deactivate it first.");
    }

    const [projectWorkstreamCount, templateWorkstreamCount] = await Promise.all([
      prisma.projectWorkstream.count({ where: { workstreamId: id } }),
      prisma.templateWorkstream.count({ where: { workstreamId: id } }),
    ]);

    if (projectWorkstreamCount > 0 || templateWorkstreamCount > 0) {
      return workstreamError(
        "Workstream not deleted: it is already used by projects or templates."
      );
    }

    await prisma.workstream.delete({
      where: { id },
    });

    revalidatePath(WORKSTREAMS_PATH);

    return workstreamOk("Workstream deleted successfully.");
  } catch (e) {
    console.error("Delete workstream error:", e);

    return workstreamError("Workstream not deleted: database error.");
  }
}

export default async function WorkstreamsPage() {
  const [locale, workstreams, phases] = await Promise.all([
    getServerLocale(),
    getWorkstreamAdminRows(),
    getActivePhaseOptions(),
  ]);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "admin.workstreams.title")}</h1>

      <WorkstreamsTable
        workstreams={workstreams}
        phases={phases}
        createWorkstream={createWorkstream}
        updateWorkstream={updateWorkstream}
        toggleWorkstream={toggleWorkstream}
        deleteWorkstream={deleteWorkstream}
      />
    </main>
  );
}
