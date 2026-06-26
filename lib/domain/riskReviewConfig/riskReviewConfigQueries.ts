import { prisma } from "@/lib/prisma";

export async function getRiskReviewTypeRows() {
  const reviewTypes = await prisma.riskReviewType.findMany({
    include: {
      _count: {
        select: { reviews: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return reviewTypes.map(({ _count, ...reviewType }) => ({
    id: reviewType.id,
    code: reviewType.code,
    name: reviewType.name,
    description: reviewType.description,
    sortOrder: reviewType.sortOrder,
    isActive: reviewType.isActive,
    isInterim: reviewType.isInterim,
    isResidual: reviewType.isResidual,
    isClosure: reviewType.isClosure,
    reviewCount: _count.reviews,
  }));
}

export async function getRiskReviewOutcomeRows() {
  const reviewOutcomes = await prisma.riskReviewOutcome.findMany({
    include: {
      _count: {
        select: { reviews: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return reviewOutcomes.map(({ _count, ...reviewOutcome }) => ({
    id: reviewOutcome.id,
    code: reviewOutcome.code,
    name: reviewOutcome.name,
    description: reviewOutcome.description,
    sortOrder: reviewOutcome.sortOrder,
    isActive: reviewOutcome.isActive,
    isPending: reviewOutcome.isPending,
    isAccepted: reviewOutcome.isAccepted,
    isContinueMitigation: reviewOutcome.isContinueMitigation,
    isEscalated: reviewOutcome.isEscalated,
    isClosed: reviewOutcome.isClosed,
    reviewCount: _count.reviews,
  }));
}
