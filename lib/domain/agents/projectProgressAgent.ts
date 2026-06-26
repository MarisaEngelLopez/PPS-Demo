import type { AgentCapabilityKey, AgentJsonValue } from "./agentTypes";
import { prisma } from "@/lib/prisma";

export const PROJECT_PROGRESS_AGENT_KEY = "PROJECT_PROGRESS";

export type ProjectProgressAgentActionResult = {
  ok: boolean;
  message: string;
};

export function progressAgentOk(message: string): ProjectProgressAgentActionResult {
  return { ok: true, message };
}

export function progressAgentError(message: string): ProjectProgressAgentActionResult {
  return { ok: false, message };
}

export async function getProjectProgressAgentConfig() {
  return prisma.agentDefinition.findUnique({
    where: { agentKey: PROJECT_PROGRESS_AGENT_KEY },
    include: { sources: true, capabilities: true, rules: true },
  });
}

export function getProjectProgressCapability(
  config: Awaited<ReturnType<typeof getProjectProgressAgentConfig>>,
  capabilityKey: AgentCapabilityKey
) {
  return config?.capabilities.find(
    (capability) => capability.capabilityKey === capabilityKey
  );
}

export function assertProjectProgressAgentEnabled(
  config: Awaited<ReturnType<typeof getProjectProgressAgentConfig>>
) {
  if (!config?.isEnabled) {
    return progressAgentError("Project Progress Assistant is disabled in Configuration.");
  }

  const textSource = config.sources.find((source) => source.sourceType === "TEXT");
  if (!textSource?.isEnabled) {
    return progressAgentError("Text input is disabled for the Project Progress Assistant.");
  }

  return null;
}

export function assertProjectProgressCapabilityEnabled(
  config: Awaited<ReturnType<typeof getProjectProgressAgentConfig>>,
  capabilityKey: AgentCapabilityKey
) {
  const capability = getProjectProgressCapability(config, capabilityKey);
  if (!capability?.isEnabled) {
    return progressAgentError(`${capabilityKey} is disabled in Agent Configuration.`);
  }

  return null;
}

export function getProjectProgressConfigSnapshot(
  config: Awaited<ReturnType<typeof getProjectProgressAgentConfig>>,
  capabilityKey: AgentCapabilityKey
): AgentJsonValue {
  const capability = getProjectProgressCapability(config, capabilityKey);

  return {
    agentKey: PROJECT_PROGRESS_AGENT_KEY,
    capabilityKey,
    approvalMode: capability?.approvalMode ?? null,
    rules:
      config?.rules.reduce<Record<string, string>>((acc, rule) => {
        acc[rule.ruleKey] = rule.value;
        return acc;
      }, {}) ?? {},
  };
}
