import { formatAgentDisplayTimestamp } from "./agentLogTime";

type AgentConfigurationLogSource = {
  id: string;
  changeType: string;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: Date;
  agent: {
    name: string;
    agentKey: string;
  };
  capability?: {
    name: string;
    capabilityKey: string;
  } | null;
};

type FlatJson = Record<string, unknown>;

function parseFlatJson(value: string | null): FlatJson {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function getChangedFields(beforeJson: string | null, afterJson: string | null) {
  const before = parseFlatJson(beforeJson);
  const after = parseFlatJson(afterJson);
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  return keys
    .filter((key) => formatValue(before[key]) !== formatValue(after[key]))
    .map((key) => ({
      field: key,
      previousValue: formatValue(before[key]),
      newValue: formatValue(after[key]),
    }));
}

export function getAgentConfigurationLogRows(logs: AgentConfigurationLogSource[]) {
  return logs.flatMap((log) => {
    const changedFields = getChangedFields(log.beforeJson, log.afterJson);
    const target = log.capability
      ? `${log.capability.name} (${log.capability.capabilityKey})`
      : log.agent.name;

    if (changedFields.length === 0) {
      return [
        {
          id: log.id,
          createdAt: log.createdAt,
          area: "Agent Configuration",
          agent: `${log.agent.name} (${log.agent.agentKey})`,
          target,
          changeType: log.changeType,
          field: "-",
          previousValue: "-",
          newValue: "-",
        },
      ];
    }

    return changedFields.map((change, index) => ({
      id: `${log.id}-${index}`,
      createdAt: log.createdAt,
      area: "Agent Configuration",
      agent: `${log.agent.name} (${log.agent.agentKey})`,
      target,
      changeType: log.changeType,
      field: change.field,
      previousValue: change.previousValue,
      newValue: change.newValue,
    }));
  });
}

export function formatLogTimestamp(value: Date) {
  return formatAgentDisplayTimestamp(value);
}

export function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
