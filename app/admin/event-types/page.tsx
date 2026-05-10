import { MainNav } from "@/components/MainNav";
import { EventTypesTable } from "@/components/admin/EventTypesTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function createEventType(formData: FormData) {
  "use server";

  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const sortOrder = Number(formData.get("sortOrder") || 100);

  try {
    if (!code || !name) {
      return {
        ok: false,
        message: "Event type not added: code and name are required.",
      };
    }

    const existing = await prisma.eventType.findFirst({
      where: { code },
    });

    if (existing) {
      return {
        ok: false,
        message: "Event type not added: already exists in database.",
      };
    }

    await prisma.eventType.create({
      data: {
        code,
        name,
        description: description || null,
        sortOrder: Number.isNaN(sortOrder) ? 100 : sortOrder,
        isActive: true,
      },
    });

    revalidatePath("/admin/event-types");

    return {
      ok: true,
      message: "Event type created successfully.",
    };
  } catch (e) {
    console.error("Create event type error:", e);

    return {
      ok: false,
      message: "Event type not added: database error.",
    };
  }
}

async function toggleEventType(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const current = String(formData.get("current") || "") === "true";

  try {
    if (!id) {
      return {
        ok: false,
        message: "Event type not updated: missing record.",
      };
    }

    const updated = await prisma.eventType.update({
      where: { id },
      data: {
        isActive: !current,
      },
    });

    revalidatePath("/admin/event-types");

    return {
      ok: true,
      message: updated.isActive
        ? "Event type activated successfully."
        : "Event type deactivated successfully.",
    };
  } catch (e) {
    console.error("Toggle event type error:", e);

    return {
      ok: false,
      message: "Event type not updated: database error.",
    };
  }
}

async function deleteEventType(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");

  try {
    if (!id) {
      return {
        ok: false,
        message: "Event type not deleted: missing record.",
      };
    }

    const existing = await prisma.eventType.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        ok: false,
        message: "Event type not deleted: it no longer exists.",
      };
    }

    if (existing.isActive) {
      return {
        ok: false,
        message: "Event type not deleted: active event types cannot be deleted.",
      };
    }

    const usedInProjectEvent = await prisma.projectEvent.findFirst({
      where: { eventTypeId: id },
    });

    if (usedInProjectEvent) {
      return {
        ok: false,
        message: "Event type not deleted: it has been used in project milestones.",
      };
    }

    await prisma.eventType.delete({
      where: { id },
    });

    revalidatePath("/admin/event-types");

    return {
      ok: true,
      message: "Event type deleted successfully.",
    };
  } catch (e) {
    console.error("Delete event type error:", e);

    return {
      ok: false,
      message: "Event type not deleted: database error.",
    };
  }
}

export default async function EventTypesPage() {
  const eventTypes = await prisma.eventType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>Event Types</h1>

      <EventTypesTable
        eventTypes={eventTypes}
        createEventType={createEventType}
        toggleEventType={toggleEventType}
        deleteEventType={deleteEventType}
      />
    </main>
  );
}