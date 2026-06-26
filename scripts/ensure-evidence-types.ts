import "dotenv/config";
import { prisma } from "../lib/prisma";

const evidenceTypes = [
  ["DOCUMENT", "Document", "Document or file reference", 10],
  ["TEST_RESULT", "Test Result", "Test result or validation output", 20],
  ["APPROVAL", "Approval", "Formal approval record", 30],
  ["AUDIT_RECORD", "Audit Record", "Audit or control record", 40],
  ["MEETING_MINUTES", "Meeting Minutes", "Meeting minutes or governance notes", 50],
  ["TRAINING_RECORD", "Training Record", "Training completion proof", 60],
  ["PHOTO", "Photo", "Photo evidence", 70],
  ["SYSTEM_CONFIGURATION", "System Configuration", "System configuration proof", 80],
  ["GO_LIVE_PROOF", "Go-live Proof", "Go-live or deployment proof", 90],
  ["OTHER", "Other", "Other evidence type", 100],
] as const;

async function main() {
  for (const [code, name, description, sortOrder] of evidenceTypes) {
    await prisma.evidenceType.upsert({
      where: { code },
      update: {},
      create: { code, name, description, sortOrder, isActive: true },
    });
  }

  console.log(`Evidence types ensured: ${evidenceTypes.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
