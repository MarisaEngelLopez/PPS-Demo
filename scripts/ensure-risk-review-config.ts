import "dotenv/config";
import { prisma } from "@/lib/prisma";

const reviewTypes = [
  {
    code: "INTERIM",
    name: "Interim",
    description: "Intermediate governance review before residual assessment or closure.",
    sortOrder: 10,
    isInterim: true,
  },
  {
    code: "RESIDUAL",
    name: "Residual",
    description: "Review of proposed residual risk position.",
    sortOrder: 20,
    isResidual: true,
  },
  {
    code: "CLOSURE",
    name: "Closure",
    description: "Governance review to approve formal risk closure.",
    sortOrder: 30,
    isClosure: true,
  },
];

const reviewOutcomes = [
  {
    code: "PENDING",
    name: "Pending",
    description: "Review is pending or not yet concluded.",
    sortOrder: 10,
    isPending: true,
  },
  {
    code: "ACCEPTED",
    name: "Accepted",
    description: "Residual risk position accepted.",
    sortOrder: 20,
    isAccepted: true,
  },
  {
    code: "CONTINUE_MITIGATION",
    name: "Continue Mitigation",
    description: "Further mitigation is required.",
    sortOrder: 30,
    isContinueMitigation: true,
  },
  {
    code: "ESCALATED",
    name: "Escalated",
    description: "Risk review outcome escalated to a higher governance level.",
    sortOrder: 40,
    isEscalated: true,
  },
  {
    code: "CLOSED",
    name: "Closed",
    description: "Risk closure approved by governance review.",
    sortOrder: 50,
    isClosed: true,
  },
];

async function main() {
  for (const reviewType of reviewTypes) {
    await prisma.riskReviewType.upsert({
      where: { code: reviewType.code },
      update: reviewType,
      create: reviewType,
    });
  }

  for (const reviewOutcome of reviewOutcomes) {
    await prisma.riskReviewOutcome.upsert({
      where: { code: reviewOutcome.code },
      update: reviewOutcome,
      create: reviewOutcome,
    });
  }

  console.log(
    `Risk review configuration ensured: ${reviewTypes.length} types, ${reviewOutcomes.length} outcomes`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
