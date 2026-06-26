import {
  deriveRiskLifecycleSummary,
  sortRiskLifecycleSummaries,
  type RiskLifecycleConfig,
  type RiskLifecycleSummary,
} from "@/lib/domain/risks/riskLifecycle";
import type { ExecutiveReportRisk } from "./executiveReportTypes";
import { statusHasUsageFlag } from "./statusUsageSemantics";

export type ExecutiveRiskLifecycleRow = {
  risk: ExecutiveReportRisk;
  lifecycle: RiskLifecycleSummary;
};

function addStatusCode(codes: Set<string>, code?: string | null) {
  if (code) codes.add(code);
}

function buildRiskLifecycleConfig(risks: ExecutiveReportRisk[]): RiskLifecycleConfig {
  const closedRiskStatusCodes = new Set(["CLOSE", "CLOSED"]);
  const openRiskActionStatusCodes = new Set(["OPEN", "IN_PROGRESS", "ACTIVE"]);
  const closedRiskActionStatusCodes = new Set(["DONE", "CLOSE", "CLOSED"]);

  risks.forEach((risk) => {
    if (statusHasUsageFlag(risk.status, "RISK", "isClosed")) {
      addStatusCode(closedRiskStatusCodes, risk.status?.code ?? risk.status?.name);
    }

    risk.riskActions?.forEach((action) => {
      if (statusHasUsageFlag(action.statusRef, "RISK_ACTION", "isOpen")) {
        addStatusCode(
          openRiskActionStatusCodes,
          action.statusRef?.code ?? action.statusRef?.name
        );
      }
      if (statusHasUsageFlag(action.statusRef, "RISK_ACTION", "isInProgress")) {
        addStatusCode(
          openRiskActionStatusCodes,
          action.statusRef?.code ?? action.statusRef?.name
        );
      }
      if (statusHasUsageFlag(action.statusRef, "RISK_ACTION", "isClosed")) {
        addStatusCode(
          closedRiskActionStatusCodes,
          action.statusRef?.code ?? action.statusRef?.name
        );
      }
    });
  });

  return {
    closedRiskStatusCodes: [...closedRiskStatusCodes],
    openRiskActionStatusCodes: [...openRiskActionStatusCodes],
    closedRiskActionStatusCodes: [...closedRiskActionStatusCodes],
  };
}

export function buildExecutiveRiskLifecycleRows(
  risks: ExecutiveReportRisk[]
): ExecutiveRiskLifecycleRow[] {
  const config = buildRiskLifecycleConfig(risks);

  return sortRiskLifecycleSummaries(
    risks.map((risk) => ({
      risk,
      lifecycle: deriveRiskLifecycleSummary(risk, config),
    }))
  );
}
