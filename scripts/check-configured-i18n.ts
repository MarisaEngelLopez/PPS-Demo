import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { hasConfiguredTranslation } from "@/lib/i18n/displayTranslations";

type Namespace =
  | "status"
  | "projectType"
  | "taskFamily"
  | "riskCategory"
  | "evidenceType"
  | "riskReviewType"
  | "riskReviewOutcome";

type CodeRow = {
  code: string;
};

const checks: {
  label: string;
  namespace: Namespace;
  read: () => Promise<CodeRow[]>;
}[] = [
  {
    label: "Status",
    namespace: "status",
    read: () => prisma.status.findMany({ select: { code: true } }),
  },
  {
    label: "ProjectType",
    namespace: "projectType",
    read: () => prisma.projectType.findMany({ select: { code: true } }),
  },
  {
    label: "TaskFamily",
    namespace: "taskFamily",
    read: () => prisma.taskFamily.findMany({ select: { code: true } }),
  },
  {
    label: "RiskCategory",
    namespace: "riskCategory",
    read: () => prisma.riskCategory.findMany({ select: { code: true } }),
  },
  {
    label: "EvidenceType",
    namespace: "evidenceType",
    read: () => prisma.evidenceType.findMany({ select: { code: true } }),
  },
  {
    label: "RiskReviewType",
    namespace: "riskReviewType",
    read: () => prisma.riskReviewType.findMany({ select: { code: true } }),
  },
  {
    label: "RiskReviewOutcome",
    namespace: "riskReviewOutcome",
    read: () => prisma.riskReviewOutcome.findMany({ select: { code: true } }),
  },
];

async function main() {
  const missing: string[] = [];

  for (const check of checks) {
    const rows = await check.read();
    for (const row of rows) {
      if (!hasConfiguredTranslation(check.namespace, row.code)) {
        missing.push(`${check.label}.${row.code} -> configured.${check.namespace}.*`);
      }
    }
  }

  if (missing.length > 0) {
    console.error("Missing configured-value dictionary mappings:");
    for (const item of missing) console.error(`- ${item}`);
    process.exitCode = 1;
    return;
  }

  console.log("Configured-value dictionary mappings are complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
