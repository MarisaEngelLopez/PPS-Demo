import "dotenv/config";
import { prisma } from "../lib/prisma";
import { generateNextBusinessCode } from "../lib/businessCodes/codeGenerator";

async function main() {
  const result = await prisma.$transaction(async (tx) => ({
    project: await generateNextBusinessCode(tx, "PROJECT"),
    risk: await generateNextBusinessCode(tx, "RISK"),
    decision: await generateNextBusinessCode(tx, "DECISION"),
    riskAction: await generateNextBusinessCode(tx, "RISK_ACTION"),
  }));

  console.log(result);
}

main().finally(async () => {
  await prisma.$disconnect();
});
