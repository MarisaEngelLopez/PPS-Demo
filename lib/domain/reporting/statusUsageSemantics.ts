type StatusUsageLike = {
  isActive?: boolean | null;
  isOpen?: boolean | null;
  isClosed?: boolean | null;
  isInProgress?: boolean | null;
  isAttention?: boolean | null;
  isPositive?: boolean | null;
  isNegative?: boolean | null;
  scope?: {
    code?: string | null;
    isActive?: boolean | null;
  } | null;
};

export type StatusLike = {
  code?: string | null;
  name?: string | null;
  usages?: StatusUsageLike[] | null;
} | null | undefined;

export type StatusUsageFlag =
  | "isOpen"
  | "isClosed"
  | "isInProgress"
  | "isAttention"
  | "isPositive"
  | "isNegative";

export function getStatusCode(status: StatusLike) {
  return status?.code?.toUpperCase() ?? status?.name?.toUpperCase() ?? "";
}

export function statusHasUsageFlag(
  status: StatusLike,
  scopeCode: string,
  flag: StatusUsageFlag
) {
  return Boolean(
    status?.usages?.some(
      (usage) =>
        usage.isActive !== false &&
        usage.scope?.isActive !== false &&
        usage[flag] === true &&
        ["DEFAULT", scopeCode].includes(usage.scope?.code?.toUpperCase() ?? "")
    )
  );
}

export function statusMatchesSemantic(
  status: StatusLike,
  scopeCode: string,
  flag: StatusUsageFlag,
  fallbackCodes: string[]
) {
  if (statusHasUsageFlag(status, scopeCode, flag)) return true;
  return fallbackCodes.includes(getStatusCode(status));
}
