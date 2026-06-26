export type StatusActionResult = {
  ok: boolean;
  message: string;
};

export type StatusScopeCode =
  | "PROJECT"
  | "DECISION"
  | "RISK"
  | "RISK_ACTION"
  | "AGENT_INSTRUCTION"
  | "AGENT_SUGGESTION"
  | "AGENT_APPROVAL"
  | "WORK_SESSION";

export type StatusReferenceCounts = {
  statusUsage: number;
  projects: number;
  projectWorkstreams: number;
  decisions: number;
  risks: number;
  riskActions: number;
  agentInstructions: number;
  agentSuggestions: number;
  agentApprovals: number;
  workSessions: number;
};

export type StatusUsageReferenceCounts = {
  records: number;
};
