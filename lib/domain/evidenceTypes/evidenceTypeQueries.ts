import { prisma } from "@/lib/prisma";

export async function getEvidenceTypeAdminRows() {
  const evidenceTypes = await prisma.evidenceType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return evidenceTypes.map((evidenceType) => ({
    ...evidenceType,
    evidenceCount: 0,
  }));
}
