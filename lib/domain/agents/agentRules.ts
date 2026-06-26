import type {
  AgentActionType,
  AgentApprovalMode,
  AgentCapabilityKey,
  AgentJsonValue,
  AgentKey,
  AgentStatusScopeCode,
  AgentSuggestionType,
  AgentTargetEntity,
} from "./agentTypes";

export const AGENT_KEYS: AgentKey[] = ["TIME_TRACKING", "PROJECT_PROGRESS"];

export const AGENT_APPROVAL_MODES: AgentApprovalMode[] = [
  "AUTO_APPLY_DISABLED",
  "MANUAL_APPROVAL",
  "DELEGATED_APPROVAL",
];

export const TIME_TRACKING_CAPABILITY_KEYS: AgentCapabilityKey[] = [
  "START_WORK_SESSION",
  "UPDATE_WORK_SESSION_NOTES",
  "PAUSE_WORK_SESSION",
  "RESUME_WORK_SESSION",
  "FINISH_WORK_SESSION",
  "CREATE_TIME_ENTRY_SUGGESTION",
  "CREATE_TIME_ENTRY",
];

export const PROJECT_PROGRESS_CAPABILITY_KEYS: AgentCapabilityKey[] = [
  "START_WORKSTREAM",
  "FINISH_WORKSTREAM",
  "REOPEN_WORKSTREAM",
  "CHANGE_WORKSTREAM_VISIBILITY",
  "COMPLETE_EVENT",
  "REOPEN_EVENT",
  "CHANGE_EVENT_VISIBILITY",
  "MOVE_COMPLETED_ITEMS_TO_DETAILED",
  "GENERATE_ACCOMPLISHMENTS_SINCE_REPORT",
];

export const AGENT_STATUS_SCOPE_CODES: AgentStatusScopeCode[] = [
  "AGENT_INSTRUCTION",
  "AGENT_SUGGESTION",
  "AGENT_APPROVAL",
  "WORK_SESSION",
];

export const AGENT_SUGGESTION_TYPES: AgentSuggestionType[] = [
  "CREATE_TIME_ENTRY",
  "UPDATE_PROGRESS",
  "UPDATE_VISIBILITY",
  "GENERATE_REPORTING_NARRATIVE",
  "ASK_CLARIFICATION",
  "NO_ACTION",
];

export const AGENT_TARGET_ENTITIES: AgentTargetEntity[] = [
  "TIME_ENTRY",
  "WORK_SESSION",
  "PROJECT",
  "PROJECT_WORKSTREAM",
  "PROJECT_EVENT",
  "PROJECT_TASK",
  "RISK",
  "RISK_ACTION",
  "DECISION",
  "REPORTING_PACK",
];

export const AGENT_ACTION_TYPES: AgentActionType[] = [
  "INSTRUCTION_CREATED",
  "INSTRUCTION_PROCESSED",
  "SUGGESTION_CREATED",
  "SUGGESTION_APPROVED",
  "SUGGESTION_REJECTED",
  "SUGGESTION_APPLIED",
  "WORK_SESSION_STARTED",
  "WORK_SESSION_PAUSED",
  "WORK_SESSION_RESUMED",
  "WORK_SESSION_FINISHED",
  "WORK_SESSION_CANCELLED",
  "TIME_ENTRY_CREATED",
  "PROJECT_PROGRESS_SUGGESTION_CREATED",
  "PROJECT_PROGRESS_SUGGESTION_APPLIED",
];

export const DEFAULT_WORK_SESSION_ROUNDING_MINUTES = 15;

export function isAgentKey(value: string): value is AgentKey {
  return AGENT_KEYS.includes(value as AgentKey);
}

export function isAgentStatusScopeCode(value: string): value is AgentStatusScopeCode {
  return AGENT_STATUS_SCOPE_CODES.includes(value as AgentStatusScopeCode);
}

export function stringifyAgentJson(value: AgentJsonValue | undefined) {
  return value === undefined ? undefined : JSON.stringify(value);
}

export function parseAgentJson<T extends AgentJsonValue>(
  value: string | null | undefined,
  fallback: T
): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function roundMinutesToIncrement(
  activeSeconds: number,
  incrementMinutes = DEFAULT_WORK_SESSION_ROUNDING_MINUTES
) {
  if (activeSeconds <= 0) return 0;

  const activeMinutes = activeSeconds / 60;
  return Math.round(activeMinutes / incrementMinutes) * incrementMinutes;
}

export function minutesToDecimalHours(minutes: number) {
  return minutes / 60;
}
