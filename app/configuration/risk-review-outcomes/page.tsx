import { RiskReviewConfigTable } from "@/components/configuration/RiskReviewConfigTable";
import { h1Style, pageStyle } from "@/components/ui/layoutStyles";
import { getRiskReviewOutcomeRows } from "@/lib/domain/riskReviewConfig/riskReviewConfigQueries";
import {
  parseRiskReviewOutcomeInput,
  riskReviewConfigError,
  riskReviewConfigOk,
  validateRiskReviewOutcomeInput,
} from "@/lib/domain/riskReviewConfig/riskReviewConfigValidation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";

const RISK_REVIEW_OUTCOMES_PATH = "/configuration/risk-review-outcomes";

async function createRiskReviewOutcome(formData: FormData) {
  "use server";

  const input = parseRiskReviewOutcomeInput(formData);

  try {
    const validation = await validateRiskReviewOutcomeInput(input);
    if (validation) return validation;

    await prisma.riskReviewOutcome.create({
      data: {
        ...input,
        isActive: true,
      },
    });

    revalidatePath(RISK_REVIEW_OUTCOMES_PATH);
    return riskReviewConfigOk("Review outcome created successfully.");
  } catch (error) {
    console.error("Create review outcome error:", error);
    return riskReviewConfigError("Review outcome not added: database error.");
  }
}

async function updateRiskReviewOutcome(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const input = parseRiskReviewOutcomeInput(formData);

  try {
    if (!id) {
      return riskReviewConfigError("Review outcome not updated: missing id.");
    }

    const validation = await validateRiskReviewOutcomeInput(input, id);
    if (validation) return validation;

    await prisma.riskReviewOutcome.update({
      where: { id },
      data: input,
    });

    revalidatePath(RISK_REVIEW_OUTCOMES_PATH);
    return riskReviewConfigOk("Review outcome updated successfully.");
  } catch (error) {
    console.error("Update review outcome error:", error);
    return riskReviewConfigError("Review outcome not updated: database error.");
  }
}

async function toggleRiskReviewOutcome(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const current = String(formData.get("current") || "") === "true";

  try {
    if (!id) {
      return riskReviewConfigError("Review outcome not updated: missing id.");
    }

    const existing = await prisma.riskReviewOutcome.findUnique({ where: { id } });
    if (!existing) {
      return riskReviewConfigError(
        "Review outcome not updated: it no longer exists."
      );
    }

    await prisma.riskReviewOutcome.update({
      where: { id },
      data: { isActive: !current },
    });

    revalidatePath(RISK_REVIEW_OUTCOMES_PATH);
    return riskReviewConfigOk(
      current
        ? "Review outcome deactivated successfully."
        : "Review outcome activated successfully."
    );
  } catch (error) {
    console.error("Toggle review outcome error:", error);
    return riskReviewConfigError("Review outcome not updated: database error.");
  }
}

async function deleteRiskReviewOutcome(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");

  try {
    if (!id) {
      return riskReviewConfigError("Review outcome not deleted: missing id.");
    }

    const existing = await prisma.riskReviewOutcome.findUnique({
      where: { id },
      include: { _count: { select: { reviews: true } } },
    });

    if (!existing) {
      return riskReviewConfigError(
        "Review outcome not deleted: it no longer exists."
      );
    }

    if (existing.isActive) {
      return riskReviewConfigError(
        "Review outcome not deleted: deactivate it first."
      );
    }

    if (existing._count.reviews > 0) {
      return riskReviewConfigError(
        "Review outcome not deleted: it is used by reviews."
      );
    }

    await prisma.riskReviewOutcome.delete({ where: { id } });

    revalidatePath(RISK_REVIEW_OUTCOMES_PATH);
    return riskReviewConfigOk("Review outcome deleted successfully.");
  } catch (error) {
    console.error("Delete review outcome error:", error);
    return riskReviewConfigError("Review outcome not deleted: database error.");
  }
}

export default async function RiskReviewOutcomesPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const reviewOutcomes = await getRiskReviewOutcomeRows();

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{t("configuration.riskReviewOutcomes.title")}</h1>

      <RiskReviewConfigTable
        title={t("configuration.riskReviewOutcomes.title")}
        createLabel={t("configuration.newReviewOutcome")}
        rows={reviewOutcomes}
        flags={[
          { key: "isPending", label: t("labels.pending") },
          { key: "isAccepted", label: t("labels.accepted") },
          { key: "isContinueMitigation", label: t("labels.continue") },
          { key: "isEscalated", label: t("labels.escalated") },
          { key: "isClosed", label: t("metrics.closed") },
        ]}
        createAction={createRiskReviewOutcome}
        updateAction={updateRiskReviewOutcome}
        toggleAction={toggleRiskReviewOutcome}
        deleteAction={deleteRiskReviewOutcome}
      />
    </main>
  );
}
