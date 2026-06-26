import type { AgentCapabilityKey, AgentJsonValue } from "./agentTypes";
import { prisma } from "@/lib/prisma";

export const TIME_TRACKING_AGENT_KEY = "TIME_TRACKING";

export type TimeTrackingAgentActionResult = {
  ok: boolean;
  message: string;
};

export function agentOk(message: string): TimeTrackingAgentActionResult {
  return { ok: true, message };
}

export function agentError(message: string): TimeTrackingAgentActionResult {
  return { ok: false, message };
}

export function parseRuleBoolean(value: string | null | undefined) {
  return String(value || "false") === "true";
}

export function parseRuleNumber(value: string | null | undefined, fallback: number) {
  const parsed = Number(value || fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getTimeTrackingAgentConfig() {
  return prisma.agentDefinition.findUnique({
    where: { agentKey: TIME_TRACKING_AGENT_KEY },
    include: {
      sources: true,
      capabilities: true,
      rules: true,
    },
  });
}

export async function getOneUserAgentUser() {
  return prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });
}

export function getCapability(
  config: Awaited<ReturnType<typeof getTimeTrackingAgentConfig>>,
  capabilityKey: AgentCapabilityKey
) {
  return config?.capabilities.find(
    (capability) => capability.capabilityKey === capabilityKey
  );
}

export function getRuleValue(
  config: Awaited<ReturnType<typeof getTimeTrackingAgentConfig>>,
  ruleKey: string
) {
  return config?.rules.find((rule) => rule.ruleKey === ruleKey)?.value;
}

export function assertAgentEnabled(
  config: Awaited<ReturnType<typeof getTimeTrackingAgentConfig>>
) {
  if (!config?.isEnabled) {
    return agentError("Time Tracking Assistant is disabled in Configuration.");
  }

  const textSource = config.sources.find((source) => source.sourceType === "TEXT");
  if (!textSource?.isEnabled) {
    return agentError("Text input is disabled for the Time Tracking Assistant.");
  }

  return null;
}

export function assertCapabilityEnabled(
  config: Awaited<ReturnType<typeof getTimeTrackingAgentConfig>>,
  capabilityKey: AgentCapabilityKey
) {
  const capability = getCapability(config, capabilityKey);
  if (!capability?.isEnabled) {
    return agentError(`${capabilityKey} is disabled in Agent Configuration.`);
  }

  return null;
}

export function getConfigSnapshot(
  config: Awaited<ReturnType<typeof getTimeTrackingAgentConfig>>,
  capabilityKey: AgentCapabilityKey
): AgentJsonValue {
  const capability = getCapability(config, capabilityKey);

  return {
    agentKey: TIME_TRACKING_AGENT_KEY,
    capabilityKey,
    approvalMode: capability?.approvalMode ?? null,
    rules:
      config?.rules.reduce<Record<string, string>>((acc, rule) => {
        acc[rule.ruleKey] = rule.value;
        return acc;
      }, {}) ?? {},
  };
}

export function datesAreSameUtcDay(a: Date, b: Date) {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}
