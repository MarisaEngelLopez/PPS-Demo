import type { Prisma } from "@prisma/client";

export async function assertProjectManagerContactExists(
  tx: Prisma.TransactionClient,
  projectManagerContactId: string
) {
  const contact = await tx.organizationContact.findFirst({
    where: {
      id: projectManagerContactId,
      isActive: true,
    },
  });

  if (!contact) {
    throw new Error("selected project manager contact was not found.");
  }

  return contact.id;
}
