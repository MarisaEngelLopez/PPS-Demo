export type BusinessCodeEntity =
  | "PROJECT"
  | "RISK"
  | "DECISION"
  | "RISK_ACTION";

export const BUSINESS_CODE_FORMATS: Record<
  BusinessCodeEntity,
  {
    prefix: string;
    width: number;
    table: string;
    field: string;
  }
> = {
  PROJECT: {
    prefix: "PR",
    width: 4,
    table: "Project",
    field: "projectCode",
  },
  RISK: {
    prefix: "RI",
    width: 4,
    table: "ProjectRisk",
    field: "riskCode",
  },
  DECISION: {
    prefix: "DE",
    width: 4,
    table: "ProjectDecision",
    field: "decisionCode",
  },
  RISK_ACTION: {
    prefix: "RA",
    width: 4,
    table: "ProjectRiskAction",
    field: "actionCode",
  },
};

export function formatBusinessCode(entityType: BusinessCodeEntity, value: number) {
  const format = BUSINESS_CODE_FORMATS[entityType];
  return `${format.prefix}_${String(value).padStart(format.width, "0")}`;
}
