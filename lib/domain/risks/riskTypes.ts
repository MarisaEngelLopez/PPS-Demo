import type { Status, StatusScope, StatusUsage } from "@prisma/client";

export type RiskActionResult = {
  ok: boolean;
  message: string;
};

export type RiskFilters = {
  projectId: string;
  statusId: string;
  ownerId: string;
  categoryId: string;
  escalated: boolean;
  redOnly: boolean;
  openOnly: boolean;
};

export type RiskMetrics = {
  total: number;
  open: number;
  inProgress: number;
  onHold: number;
  closed: number;
  red: number;
  escalated: number;
  dueThisMonth: number;
  overdue: number;
};

export type StatusOption = {
  status: Status;
  usage: StatusUsage & {
    status: Status;
    scope: StatusScope;
  };
};
