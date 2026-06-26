import type { Status, StatusScope, StatusUsage } from "@prisma/client";

export type DecisionActionResult = {
  ok: boolean;
  message: string;
};

export type DecisionImpact = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type DecisionVisibility = "EXECUTIVE" | "BOTH" | "DETAILED" | "HIDDEN";

export type DecisionFilters = {
  projectId: string;
  status: string;
  impact: string;
  owner: string;
  escalated: boolean;
  overdueOnly: boolean;
  openOnly: boolean;
};

export type DecisionMetrics = {
  total: number;
  open: number;
  inProgress: number;
  onHold: number;
  attention: number;
  approved: number;
  rejected: number;
  overdue: number;
  escalated: number;
  critical: number;
};

export type DecisionStatusOption = {
  status: Status;
  usage: StatusUsage & {
    status: Status;
    scope: StatusScope;
  };
};
