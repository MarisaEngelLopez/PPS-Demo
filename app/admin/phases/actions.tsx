"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createPhase(formData: FormData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const sortOrder = Number(formData.get("sortOrder") || 0);

  try {
    if (!name) {
      return {
        ok: false,
        message: "Phase not added: name is required.",
      };
    }

    const existing = await prisma.phase.findFirst({
      where: {
        name: {
          equals: name,
        },
      },
    });

    if (existing) {
      return {
        ok: false,
        message: "Phase not added: already exists in database.",
      };
    }

    await prisma.phase.create({
      data: {
        name,
        description: description || null,
        sortOrder,
        isActive: true,
      },
    });

    revalidatePath("/admin/phases");

    return {
      ok: true,
      message: "Phase created successfully.",
    };
  } catch (e) {
    console.error("Create phase error:", e);

    return {
      ok: false,
      message: "Phase not added: database error.",
    };
  }
}

export async function togglePhase(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const current = formData.get("current") === "true";

  try {
    // Optional safety check
    const existing = await prisma.phase.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        ok: false,
        message: "Phase not updated: it no longer exists.",
      };
    }

    const updated = await prisma.phase.update({
      where: { id },
      data: {
        isActive: !current,
      },
    });

    revalidatePath("/admin/phases");

    return {
      ok: true,
      message: updated.isActive
        ? "Phase activated successfully."
        : "Phase deactivated successfully.",
    };
  } catch (e) {
    console.error("Toggle phase error:", e);

    return {
      ok: false,
      message: "Phase not updated: database error.",
    };
  }
}

export async function deletePhase(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));

  try {
    // 🔍 Check if phase is used
    const inUse = await prisma.workstream.findFirst({
      where: { phaseId: id },
    });

    if (inUse) {
      return {
        ok: false,
        message: "Phase not deleted: it has been used in other functions.",
      };
    }

    // ✅ Safe to delete
    await prisma.phase.delete({
      where: { id },
    });

    revalidatePath("/admin/phases");

    return {
      ok: true,
      message: "Phase deleted successfully.",
    };
  } catch (e) {
    console.error("Delete phase error:", e);

    return {
      ok: false,
      message: "Phase not deleted: database error.",
    };
  }
}