import { prisma } from "@/lib/prisma";

export async function getEventTypeAdminRows() {
  const eventTypes = await prisma.eventType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return Promise.all(
    eventTypes.map(async (eventType) => ({
      ...eventType,
      milestoneCount: await prisma.projectEvent.count({
        where: { eventTypeId: eventType.id },
      }),
    }))
  );
}
