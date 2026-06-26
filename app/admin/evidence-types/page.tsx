import { EvidenceTypesTable } from "@/components/admin/EvidenceTypesTable";
import { h1Style, pageStyle } from "@/components/ui/layoutStyles";
import { getEvidenceTypeAdminRows } from "@/lib/domain/evidenceTypes/evidenceTypeQueries";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import {
  evidenceTypeError,
  evidenceTypeOk,
  parseEvidenceTypeInput,
  validateEvidenceTypeInput,
} from "@/lib/domain/evidenceTypes/evidenceTypeValidation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const EVIDENCE_TYPES_PATH = "/admin/evidence-types";

async function createEvidenceType(formData: FormData) {
  "use server";

  const input = parseEvidenceTypeInput(formData);

  try {
    const validation = await validateEvidenceTypeInput(input);
    if (validation) return validation;

    await prisma.evidenceType.create({
      data: {
        ...input,
        isActive: true,
      },
    });

    revalidatePath(EVIDENCE_TYPES_PATH);

    return evidenceTypeOk("Evidence type created successfully.");
  } catch (error) {
    console.error("Create evidence type error:", error);

    return evidenceTypeError("Evidence type not added: database error.");
  }
}

async function updateEvidenceType(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const input = parseEvidenceTypeInput(formData);

  try {
    if (!id) return evidenceTypeError("Evidence type not updated: missing id.");

    const validation = await validateEvidenceTypeInput(input, id);
    if (validation) return validation;

    await prisma.evidenceType.update({
      where: { id },
      data: input,
    });

    revalidatePath(EVIDENCE_TYPES_PATH);

    return evidenceTypeOk("Evidence type updated successfully.");
  } catch (error) {
    console.error("Update evidence type error:", error);

    return evidenceTypeError("Evidence type not updated: database error.");
  }
}

async function toggleEvidenceType(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const current = String(formData.get("current") || "") === "true";

  try {
    if (!id) {
      return evidenceTypeError("Evidence type not updated: missing record.");
    }

    const existing = await prisma.evidenceType.findUnique({
      where: { id },
    });

    if (!existing) {
      return evidenceTypeError("Evidence type not updated: it no longer exists.");
    }

    const updated = await prisma.evidenceType.update({
      where: { id },
      data: {
        isActive: !current,
      },
    });

    revalidatePath(EVIDENCE_TYPES_PATH);

    return evidenceTypeOk(
      updated.isActive
        ? "Evidence type activated successfully."
        : "Evidence type deactivated successfully."
    );
  } catch (error) {
    console.error("Toggle evidence type error:", error);

    return evidenceTypeError("Evidence type not updated: database error.");
  }
}

async function deleteEvidenceType(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");

  try {
    if (!id) {
      return evidenceTypeError("Evidence type not deleted: missing record.");
    }

    const existing = await prisma.evidenceType.findUnique({
      where: { id },
    });

    if (!existing) {
      return evidenceTypeError("Evidence type not deleted: it no longer exists.");
    }

    if (existing.isActive) {
      return evidenceTypeError("Evidence type not deleted: deactivate it first.");
    }

    await prisma.evidenceType.delete({
      where: { id },
    });

    revalidatePath(EVIDENCE_TYPES_PATH);

    return evidenceTypeOk("Evidence type deleted successfully.");
  } catch (error) {
    console.error("Delete evidence type error:", error);

    return evidenceTypeError("Evidence type not deleted: database error.");
  }
}

export default async function EvidenceTypesPage() {
  const [locale, evidenceTypes] = await Promise.all([
    getServerLocale(),
    getEvidenceTypeAdminRows(),
  ]);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "admin.evidenceTypes.title")}</h1>

      <EvidenceTypesTable
        evidenceTypes={evidenceTypes}
        createEvidenceType={createEvidenceType}
        updateEvidenceType={updateEvidenceType}
        toggleEvidenceType={toggleEvidenceType}
        deleteEvidenceType={deleteEvidenceType}
      />
    </main>
  );
}
