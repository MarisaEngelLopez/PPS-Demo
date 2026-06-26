import { EventTypesTable } from "@/components/admin/EventTypesTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { getEventTypeAdminRows } from "@/lib/domain/eventTypes/eventTypeQueries";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import {
  eventTypeError,
  eventTypeOk,
  parseEventTypeInput,
  validateEventTypeInput,
} from "@/lib/domain/eventTypes/eventTypeValidation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const EVENT_TYPES_PATH = "/admin/event-types";

async function createEventType(formData: FormData) {
  "use server";

  const input = parseEventTypeInput(formData);

  try {
    const validation = await validateEventTypeInput(input);
    if (validation) return validation;

    await prisma.eventType.create({
      data: {
        ...input,
        isActive: true,
      },
    });

    revalidatePath(EVENT_TYPES_PATH);

    return eventTypeOk("Event type created successfully.");
  } catch (e) {
    console.error("Create event type error:", e);

    return eventTypeError("Event type not added: database error.");
  }
}

async function updateEventType(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const input = parseEventTypeInput(formData);

  try {
    if (!id) return eventTypeError("Event type not updated: missing id.");

    const validation = await validateEventTypeInput(input, id);
    if (validation) return validation;

    await prisma.eventType.update({
      where: { id },
      data: input,
    });

    revalidatePath(EVENT_TYPES_PATH);

    return eventTypeOk("Event type updated successfully.");
  } catch (e) {
    console.error("Update event type error:", e);

    return eventTypeError("Event type not updated: database error.");
  }
}

async function toggleEventType(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const current = String(formData.get("current") || "") === "true";

  try {
    if (!id) {
      return eventTypeError("Event type not updated: missing record.");
    }

    const existing = await prisma.eventType.findUnique({
      where: { id },
    });

    if (!existing) {
      return eventTypeError("Event type not updated: it no longer exists.");
    }

    const updated = await prisma.eventType.update({
      where: { id },
      data: {
        isActive: !current,
      },
    });

    revalidatePath(EVENT_TYPES_PATH);

    return eventTypeOk(
      updated.isActive
        ? "Event type activated successfully."
        : "Event type deactivated successfully."
    );
  } catch (e) {
    console.error("Toggle event type error:", e);

    return eventTypeError("Event type not updated: database error.");
  }
}

async function deleteEventType(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");

  try {
    if (!id) {
      return eventTypeError("Event type not deleted: missing record.");
    }

    const existing = await prisma.eventType.findUnique({
      where: { id },
    });

    if (!existing) {
      return eventTypeError("Event type not deleted: it no longer exists.");
    }

    if (existing.isActive) {
      return eventTypeError("Event type not deleted: deactivate it first.");
    }

    const milestoneCount = await prisma.projectEvent.count({
      where: { eventTypeId: id },
    });

    if (milestoneCount > 0) {
      return eventTypeError(
        "Event type not deleted: it is already used by project milestones."
      );
    }

    await prisma.eventType.delete({
      where: { id },
    });

    revalidatePath(EVENT_TYPES_PATH);

    return eventTypeOk("Event type deleted successfully.");
  } catch (e) {
    console.error("Delete event type error:", e);

    return eventTypeError("Event type not deleted: database error.");
  }
}

export default async function EventTypesPage() {
  const [locale, eventTypes] = await Promise.all([
    getServerLocale(),
    getEventTypeAdminRows(),
  ]);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "admin.events.title")}</h1>

      <EventTypesTable
        eventTypes={eventTypes}
        createEventType={createEventType}
        updateEventType={updateEventType}
        toggleEventType={toggleEventType}
        deleteEventType={deleteEventType}
      />
    </main>
  );
}
