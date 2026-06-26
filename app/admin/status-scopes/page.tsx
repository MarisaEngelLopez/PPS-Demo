import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { h1Style, pageStyle } from "@/components/ui/layoutStyles";
import { StatusScopesTable } from "@/components/admin/StatusScopesTable";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import {
  actionError,
  actionOk,
  parseStatusScopeInput,
  validateStatusScopeInput,
} from "@/lib/domain/statuses/statusValidation";

async function saveStatusScope(formData: FormData) {
  "use server";

  const input = parseStatusScopeInput(formData);

  try {
    const validation = await validateStatusScopeInput(input);
    if (validation) return validation;

    await prisma.statusScope.create({
      data: input,
    });

    revalidatePath("/admin/status-scopes");

    return actionOk("Status scope created successfully.");
  } catch (e) {
    console.error("Create status scope error:", e);

    return actionError("Status scope not created: database error.");
  }
}

async function updateStatusScope(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const input = parseStatusScopeInput(formData);

  try {
    if (!id) return actionError("Status scope not updated: missing id.");

    const validation = await validateStatusScopeInput(input, id);
    if (validation) return validation;

    await prisma.statusScope.update({
      where: { id },
      data: input,
    });

    revalidatePath("/admin/status-scopes");

    return actionOk("Status scope updated successfully.");
  } catch (e) {
    console.error("Update status scope error:", e);

    return actionError("Status scope not updated: database error.");
  }
}

async function deleteStatusScope(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  if (!id) return actionError("Status scope not deleted: missing id.");

  try {
    const scope = await prisma.statusScope.findUnique({
      where: { id },
    });

    if (!scope) {
      return actionError("Status scope not deleted: it no longer exists.");
    }

    const usage = await prisma.statusUsage.findFirst({
      where: { scopeId: id },
    });

    if (usage) {
      await prisma.statusScope.update({
        where: { id },
        data: { isActive: false },
      });

      revalidatePath("/admin/status-scopes");

      return actionOk(
        "Status scope is used by status usage records, so it was deactivated."
      );
    }

    if (scope.isActive) {
      return actionError("Status scope not deleted: deactivate it first.");
    }

    await prisma.statusScope.delete({
      where: { id },
    });

    revalidatePath("/admin/status-scopes");

    return actionOk("Status scope deleted successfully.");
  } catch (e) {
    console.error("Delete status scope error:", e);

    return actionError("Status scope not deleted: database error.");
  }
}

export default async function StatusScopesPage() {
  const [locale, scopes] = await Promise.all([
    getServerLocale(),
    prisma.statusScope.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "admin.statusScopes.title")}</h1>

      <StatusScopesTable
        scopes={scopes}
        saveStatusScope={saveStatusScope}
        updateStatusScope={updateStatusScope}
        deleteStatusScope={deleteStatusScope}
      />
    </main>
  );
}
