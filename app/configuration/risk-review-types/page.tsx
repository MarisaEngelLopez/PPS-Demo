import { RiskReviewConfigTable } from "@/components/configuration/RiskReviewConfigTable";
import { h1Style, pageStyle } from "@/components/ui/layoutStyles";
import { getRiskReviewTypeRows } from "@/lib/domain/riskReviewConfig/riskReviewConfigQueries";
import {
  parseRiskReviewTypeInput,
  riskReviewConfigError,
  riskReviewConfigOk,
  validateRiskReviewTypeInput,
} from "@/lib/domain/riskReviewConfig/riskReviewConfigValidation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";

const RISK_REVIEW_TYPES_PATH = "/configuration/risk-review-types";

async function createRiskReviewType(formData: FormData) {
  "use server";

  const input = parseRiskReviewTypeInput(formData);

  try {
    const validation = await validateRiskReviewTypeInput(input);
    if (validation) return validation;

    await prisma.riskReviewType.create({
      data: {
        ...input,
        isActive: true,
      },
    });

    revalidatePath(RISK_REVIEW_TYPES_PATH);
    return riskReviewConfigOk("Review type created successfully.");
  } catch (error) {
    console.error("Create review type error:", error);
    return riskReviewConfigError("Review type not added: database error.");
  }
}

async function updateRiskReviewType(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const input = parseRiskReviewTypeInput(formData);

  try {
    if (!id) return riskReviewConfigError("Review type not updated: missing id.");

    const validation = await validateRiskReviewTypeInput(input, id);
    if (validation) return validation;

    await prisma.riskReviewType.update({
      where: { id },
      data: input,
    });

    revalidatePath(RISK_REVIEW_TYPES_PATH);
    return riskReviewConfigOk("Review type updated successfully.");
  } catch (error) {
    console.error("Update review type error:", error);
    return riskReviewConfigError("Review type not updated: database error.");
  }
}

async function toggleRiskReviewType(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const current = String(formData.get("current") || "") === "true";

  try {
    if (!id) return riskReviewConfigError("Review type not updated: missing id.");

    const existing = await prisma.riskReviewType.findUnique({ where: { id } });
    if (!existing) {
      return riskReviewConfigError("Review type not updated: it no longer exists.");
    }

    await prisma.riskReviewType.update({
      where: { id },
      data: { isActive: !current },
    });

    revalidatePath(RISK_REVIEW_TYPES_PATH);
    return riskReviewConfigOk(
      current
        ? "Review type deactivated successfully."
        : "Review type activated successfully."
    );
  } catch (error) {
    console.error("Toggle review type error:", error);
    return riskReviewConfigError("Review type not updated: database error.");
  }
}

async function deleteRiskReviewType(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");

  try {
    if (!id) return riskReviewConfigError("Review type not deleted: missing id.");

    const existing = await prisma.riskReviewType.findUnique({
      where: { id },
      include: { _count: { select: { reviews: true } } },
    });

    if (!existing) {
      return riskReviewConfigError("Review type not deleted: it no longer exists.");
    }

    if (existing.isActive) {
      return riskReviewConfigError("Review type not deleted: deactivate it first.");
    }

    if (existing._count.reviews > 0) {
      return riskReviewConfigError("Review type not deleted: it is used by reviews.");
    }

    await prisma.riskReviewType.delete({ where: { id } });

    revalidatePath(RISK_REVIEW_TYPES_PATH);
    return riskReviewConfigOk("Review type deleted successfully.");
  } catch (error) {
    console.error("Delete review type error:", error);
    return riskReviewConfigError("Review type not deleted: database error.");
  }
}

export default async function RiskReviewTypesPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const reviewTypes = await getRiskReviewTypeRows();

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{t("configuration.riskReviewTypes.title")}</h1>

      <RiskReviewConfigTable
        title={t("configuration.riskReviewTypes.title")}
        createLabel={t("configuration.newReviewType")}
        rows={reviewTypes}
        flags={[
          { key: "isInterim", label: t("labels.interim") },
          { key: "isResidual", label: t("labels.residual") },
          { key: "isClosure", label: t("labels.closure") },
        ]}
        createAction={createRiskReviewType}
        updateAction={updateRiskReviewType}
        toggleAction={toggleRiskReviewType}
        deleteAction={deleteRiskReviewType}
      />
    </main>
  );
}
