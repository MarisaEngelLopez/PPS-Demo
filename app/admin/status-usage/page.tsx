import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { StatusUsageTable } from "@/components/admin/StatusUsageTable";
import { h1Style, pageStyle } from "@/components/ui/layoutStyles";
import { countStatusUsageRecords } from "@/lib/domain/statuses/statusQueries";
import { isChecked, normalizeSortOrder } from "@/lib/domain/statuses/statusRules";
import { actionError, actionOk } from "@/lib/domain/statuses/statusValidation";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";

async function saveStatusUsage(formData: FormData) {
  "use server";

  const statusId = String(formData.get("statusId") || "");
  const scopeId = String(formData.get("scopeId") || "");
  const sortOrder = normalizeSortOrder(formData.get("sortOrder"));
  const isDefault = isChecked(formData, "isDefault");

  try {
    if (!statusId || !scopeId) {
      return actionError("Status usage not saved: status and scope are required.");
    }

    await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.statusUsage.updateMany({
          where: { scopeId, NOT: { statusId } },
          data: { isDefault: false },
        });
      }

      await tx.statusUsage.upsert({
        where: {
          statusId_scopeId: {
            statusId,
            scopeId,
          },
        },
        update: {
          sortOrder,
          isDefault,
          isActive: isChecked(formData, "isActive"),
          isOpen: isChecked(formData, "isOpen"),
          isClosed: isChecked(formData, "isClosed"),
          isInProgress: isChecked(formData, "isInProgress"),
          isAttention: isChecked(formData, "isAttention"),
          isPositive: isChecked(formData, "isPositive"),
          isNegative: isChecked(formData, "isNegative"),
        },
        create: {
          statusId,
          scopeId,
          sortOrder,
          isDefault,
          isActive: isChecked(formData, "isActive"),
          isOpen: isChecked(formData, "isOpen"),
          isClosed: isChecked(formData, "isClosed"),
          isInProgress: isChecked(formData, "isInProgress"),
          isAttention: isChecked(formData, "isAttention"),
          isPositive: isChecked(formData, "isPositive"),
          isNegative: isChecked(formData, "isNegative"),
        },
      });
    });

    revalidatePath("/admin/status-usage");

    return actionOk("Status usage saved successfully.");
  } catch (e) {
    console.error("Save status usage error:", e);

    return actionError("Status usage not saved: database error.");
  }
}

async function updateStatusUsage(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const statusId = String(formData.get("statusId") || "");
  const scopeId = String(formData.get("scopeId") || "");
  const sortOrder = normalizeSortOrder(formData.get("sortOrder"));
  const isDefault = isChecked(formData, "isDefault");

  try {
    if (!id || !statusId || !scopeId) {
      return actionError("Status usage not updated: missing required data.");
    }

    const duplicate = await prisma.statusUsage.findFirst({
      where: {
        statusId,
        scopeId,
        NOT: { id },
      },
    });

    if (duplicate) {
      return actionError("Status usage not updated: status is already assigned to this scope.");
    }

    await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.statusUsage.updateMany({
          where: { scopeId, NOT: { id } },
          data: { isDefault: false },
        });
      }

      await tx.statusUsage.update({
        where: { id },
        data: {
          statusId,
          scopeId,
          sortOrder,
          isDefault,
          isActive: isChecked(formData, "isActive"),
          isOpen: isChecked(formData, "isOpen"),
          isClosed: isChecked(formData, "isClosed"),
          isInProgress: isChecked(formData, "isInProgress"),
          isAttention: isChecked(formData, "isAttention"),
          isPositive: isChecked(formData, "isPositive"),
          isNegative: isChecked(formData, "isNegative"),
        },
      });
    });

    revalidatePath("/admin/status-usage");

    return actionOk("Status usage updated successfully.");
  } catch (e) {
    console.error("Update status usage error:", e);

    return actionError("Status usage not updated: database error.");
  }
}

async function deleteStatusUsage(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  if (!id) return actionError("Status usage not deleted: missing id.");

  try {
    const usage = await prisma.statusUsage.findUnique({
      where: { id },
      include: {
        status: true,
        scope: true,
      },
    });

    if (!usage) {
      return actionError("Status usage not deleted: it no longer exists.");
    }

    const count = await countStatusUsageRecords(usage.scope.code, usage.statusId);

    if (count > 0) {
      await prisma.statusUsage.update({
        where: { id },
        data: { isActive: false, isDefault: false },
      });

      revalidatePath("/admin/status-usage");

      return actionOk(
        "Status usage is used by project records, so it was deactivated."
      );
    }

    if (usage.isActive) {
      return actionError("Status usage not deleted: deactivate it first.");
    }

    await prisma.statusUsage.delete({
      where: { id },
    });

    revalidatePath("/admin/status-usage");

    return actionOk("Status usage deleted successfully.");
  } catch (e) {
    console.error("Delete status usage error:", e);

    return actionError("Status usage not deleted: database error.");
  }
}

export default async function StatusUsagePage() {
  const [locale, statuses, scopes, usages] = await Promise.all([
    getServerLocale(),
    prisma.status.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),

    prisma.statusScope.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),

    prisma.statusUsage.findMany({
      include: {
        status: true,
        scope: true,
      },
      orderBy: [
        { scope: { sortOrder: "asc" } },
        { sortOrder: "asc" },
      ],
    }),
  ]);

  const usagesWithCounts = await Promise.all(
    usages.map(async (usage) => ({
      ...usage,
      recordCount: await countStatusUsageRecords(usage.scope.code, usage.statusId),
    }))
  );

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "admin.statusUsage.title")}</h1>

      <StatusUsageTable
        statuses={statuses}
        scopes={scopes}
        usages={usagesWithCounts}
        saveStatusUsage={saveStatusUsage}
        updateStatusUsage={updateStatusUsage}
        deleteStatusUsage={deleteStatusUsage}
      />
    </main>
  );
}
