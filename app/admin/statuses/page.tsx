import { StatusesTable } from "@/components/admin/StatusesTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { countStatusReferences, getStatusAdminRows } from "@/lib/domain/statuses/statusQueries";
import { hasAnyStatusReferences } from "@/lib/domain/statuses/statusRules";
import { translate } from "@/lib/i18n/dictionaries";
import {
  actionError,
  actionOk,
  parseStatusInput,
  validateStatusInput,
} from "@/lib/domain/statuses/statusValidation";
import { prisma } from "@/lib/prisma";
import { getServerLocale } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";

async function createStatus(formData: FormData) {
  "use server";

  const input = parseStatusInput(formData);

  try {
    const validation = await validateStatusInput(input);
    if (validation) return validation;

    await prisma.status.create({
      data: {
        ...input,
        isActive: true,
      },
    });

    revalidatePath("/admin/statuses");

    return actionOk("Status created successfully.");
  } catch (e) {
    console.error("Create status error:", e);

    return actionError("Status not added: database error.");
  }
}

async function updateStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const input = parseStatusInput(formData);

  try {
    if (!id) return actionError("Status not updated: missing id.");

    const validation = await validateStatusInput(input, id);
    if (validation) return validation;

    await prisma.status.update({
      where: { id },
      data: input,
    });

    revalidatePath("/admin/statuses");

    return actionOk("Status updated successfully.");
  } catch (e) {
    console.error("Update status error:", e);

    return actionError("Status not updated: database error.");
  }
}

async function toggleActive(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const current = String(formData.get("current")) === "true";

  try {
    const existing = await prisma.status.findUnique({
      where: { id },
    });

    if (!existing) {
      return actionError("Status not updated: it no longer exists.");
    }

    const updated = await prisma.status.update({
      where: { id },
      data: { isActive: !current },
    });

    revalidatePath("/admin/statuses");

    return actionOk(
      updated.isActive
        ? "Status activated successfully."
        : "Status deactivated successfully."
    );
  } catch (e) {
    console.error("Toggle status error:", e);

    return actionError("Status not updated: database error.");
  }
}

async function deleteStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));

  try {
    const existing = await prisma.status.findUnique({
      where: { id },
    });

    if (!existing) {
      return actionError("Status not deleted: it no longer exists.");
    }

    if (existing.isActive) {
      return actionError("Status not deleted: deactivate it first.");
    }

    const references = await countStatusReferences(existing.id);

    if (hasAnyStatusReferences(references)) {
      return actionError(
        "Status not deleted: it is already used by configuration or project records."
      );
    }

    await prisma.status.delete({
      where: { id },
    });

    revalidatePath("/admin/statuses");

    return actionOk("Status deleted successfully.");
  } catch (e) {
    console.error("Delete status error:", e);

    return actionError("Status not deleted: database error.");
  }
}

export default async function ProjectStatusesPage() {
  const [locale, statuses] = await Promise.all([
    getServerLocale(),
    getStatusAdminRows(),
  ]);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "admin.statuses.title")}</h1>

      <StatusesTable
        statuses={statuses}
        createStatus={createStatus}
        updateStatus={updateStatus}
        toggleActive={toggleActive}
        deleteStatus={deleteStatus}
      />
    </main>
  );
}
