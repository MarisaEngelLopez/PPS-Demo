import type { AgentApprovalMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const AGENT_CONFIGURATION_PATH = "/configuration/agents";

export function normalizeAgentBoolean(value: FormDataEntryValue | null) {
  return String(value || "") === "true";
}

export function normalizeAgentNumber(
  value: FormDataEntryValue | null,
  fallback: number
) {
  const parsed = Number(value || fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isAgentApprovalMode(value: string): value is AgentApprovalMode {
  return [
    "AUTO_APPLY_DISABLED",
    "MANUAL_APPROVAL",
    "DELEGATED_APPROVAL",
  ].includes(value);
}

export function normalizeAgentApprovalMode(value: FormDataEntryValue | null) {
  const mode = String(value || "MANUAL_APPROVAL");
  return isAgentApprovalMode(mode) ? mode : "MANUAL_APPROVAL";
}

export async function getAgentConfigurationPageData() {
  return prisma.agentDefinition.findMany({
    include: {
      sources: {
        orderBy: [{ sortOrder: "asc" }, { sourceType: "asc" }],
      },
      capabilities: {
        orderBy: [{ sortOrder: "asc" }, { capabilityKey: "asc" }],
      },
      instructionTemplates: {
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      },
      rules: {
        where: { capabilityId: null },
        orderBy: [{ sortOrder: "asc" }, { ruleKey: "asc" }],
      },
      configLogs: {
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
