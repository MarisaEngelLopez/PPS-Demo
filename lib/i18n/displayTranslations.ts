import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { AppLocale } from "@/lib/i18n/locales";

type Translator = (key: TranslationKey) => string;
type ConfiguredNamespace =
  | "status"
  | "projectType"
  | "taskFamily"
  | "riskCategory"
  | "evidenceType"
  | "riskReviewType"
  | "riskReviewOutcome";

type ConfiguredDisplayOption = {
  code?: string | null;
  name?: string | null;
  nameEs?: string | null;
};

export const PROJECT_VISIBILITY_VALUES = [
  "BOTH",
  "EXECUTIVE",
  "DETAILED",
  "HIDDEN",
] as const;

export const TIMELINE_VIEW_VALUES = ["ALL", "EXECUTIVE", "DETAILED"] as const;

export const PROJECT_HEALTH_VALUES = ["GREEN", "AMBER", "RED"] as const;

export const DECISION_IMPACT_VALUES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export const RISK_SCORE_VALUES = ["1", "2", "3", "4", "5"] as const;

export const RISK_ASSESSMENT_TYPE_VALUES = ["INHERENT", "RESIDUAL"] as const;

const visibilityKeys: Record<string, TranslationKey> = {
  BOTH: "visibility.both",
  EXECUTIVE: "visibility.executive",
  DETAILED: "visibility.detailed",
  HIDDEN: "visibility.hidden",
  ALL: "visibility.all",
};

const healthKeys: Record<string, TranslationKey> = {
  GREEN: "health.green",
  AMBER: "health.amber",
  RED: "health.red",
};

const impactKeys: Record<string, TranslationKey> = {
  LOW: "impact.low",
  MEDIUM: "impact.medium",
  HIGH: "impact.high",
  CRITICAL: "impact.critical",
};

const riskScoreKeys: Record<string, TranslationKey> = {
  "1": "riskScore.1",
  "2": "riskScore.2",
  "3": "riskScore.3",
  "4": "riskScore.4",
  "5": "riskScore.5",
};

const riskAssessmentTypeKeys: Record<string, TranslationKey> = {
  INHERENT: "riskAssessment.inherent",
  RESIDUAL: "riskAssessment.residual",
};

const reportingPackStatusKeys: Record<string, TranslationKey> = {
  DRAFT: "reportingPackStatus.draft",
  READY: "reportingPackStatus.ready",
  APPROVED: "reportingPackStatus.approved",
  ARCHIVED: "reportingPackStatus.archived",
};

export const configuredValueKeys: Record<ConfiguredNamespace, Record<string, TranslationKey>> = {
  status: {
    ACTIVE: "configured.status.active",
    APPROVED: "configured.status.approved",
    CANCELLED: "configured.status.cancelled",
    CLOSED: "configured.status.closed",
    COMPLETED: "configured.status.completed",
    DRAFT: "configured.status.draft",
    IN_PROGRESS: "configured.status.in_progress",
    ON_HOLD: "configured.status.on_hold",
    OPEN: "configured.status.open",
    REJECTED: "configured.status.rejected",
  },
  projectType: {
    DP_INTPMO: "configured.projectType.dp_intpmo",
    IT_IMPL: "configured.projectType.it_impl",
    OP_TRANSF: "configured.projectType.op_transf",
  },
  taskFamily: {
    DTM: "configured.taskFamily.dtm",
    MIG: "configured.taskFamily.mig",
    MDA: "configured.taskFamily.mda",
    KPI: "configured.taskFamily.kpi",
    MEE: "configured.taskFamily.mee",
    MIS: "configured.taskFamily.mis",
    PLA: "configured.taskFamily.pla",
    REP: "configured.taskFamily.rep",
    RIS: "configured.taskFamily.ris",
    STE: "configured.taskFamily.ste",
    TES: "configured.taskFamily.tes",
    THI: "configured.taskFamily.thi",
    UAT: "configured.taskFamily.uat",
  },
  riskCategory: {
    SCOPE: "configured.riskCategory.scope",
    SCHEDULE: "configured.riskCategory.schedule",
    COST: "configured.riskCategory.cost",
    QUALITY: "configured.riskCategory.quality",
    RESOURCE: "configured.riskCategory.resource",
    STAKEHOLDER: "configured.riskCategory.stakeholder",
    TECHNICAL: "configured.riskCategory.technical",
    SUPPLIER: "configured.riskCategory.supplier",
    COMPLIANCE: "configured.riskCategory.compliance",
    OPERATIONAL: "configured.riskCategory.operational",
  },
  evidenceType: {
    DOCUMENT: "configured.evidenceType.document",
    TEST_RESULT: "configured.evidenceType.test_result",
    APPROVAL: "configured.evidenceType.approval",
    AUDIT_RECORD: "configured.evidenceType.audit_record",
    MEETING_MINUTES: "configured.evidenceType.meeting_minutes",
    TRAINING_RECORD: "configured.evidenceType.training_record",
    PHOTO: "configured.evidenceType.photo",
    SYSTEM_CONFIGURATION: "configured.evidenceType.system_configuration",
    GO_LIVE_PROOF: "configured.evidenceType.go_live_proof",
    CONTRACT: "configured.evidenceType.contract",
    OTHER: "configured.evidenceType.other",
  },
  riskReviewType: {
    INTERIM: "configured.riskReviewType.interim",
    RESIDUAL: "configured.riskReviewType.residual",
    CLOSURE: "configured.riskReviewType.closure",
  },
  riskReviewOutcome: {
    PENDING: "configured.riskReviewOutcome.pending",
    ACCEPTED: "configured.riskReviewOutcome.accepted",
    CONTINUE_MITIGATION: "configured.riskReviewOutcome.continue_mitigation",
    ESCALATED: "configured.riskReviewOutcome.escalated",
    CLOSED: "configured.riskReviewOutcome.closed",
  },
};

const riskLifecycleStageKeys: Record<string, TranslationKey> = {
  COMMITTEE_REVIEW: "riskLifecycle.committeeReview",
  RESIDUAL_ASSESSMENT: "riskLifecycle.residualAssessment",
  MITIGATION_EXECUTION: "riskLifecycle.mitigationExecution",
  MITIGATION_PLANNING: "riskLifecycle.mitigationPlanning",
  IDENTIFIED: "riskLifecycle.identified",
  CLOSED: "riskLifecycle.closed",
};

function optionFromValue(value: string, t: Translator, labels: Record<string, TranslationKey>) {
  return {
    value,
    label: labels[value] ? t(labels[value]) : value,
  };
}

export function translateVisibility(value: string | null | undefined, t: Translator) {
  if (!value) return "";
  return visibilityKeys[value] ? t(visibilityKeys[value]) : value;
}

export function getVisibilityOptions(t: Translator) {
  return PROJECT_VISIBILITY_VALUES.map((value) =>
    optionFromValue(value, t, visibilityKeys)
  );
}

export function getTimelineViewOptions(t: Translator) {
  return TIMELINE_VIEW_VALUES.map((value) => optionFromValue(value, t, visibilityKeys));
}

export function translateProjectHealth(value: string | null | undefined, t: Translator) {
  if (!value) return "";
  return healthKeys[value] ? t(healthKeys[value]) : value;
}

export function getProjectHealthOptions(t: Translator) {
  return PROJECT_HEALTH_VALUES.map((value) => optionFromValue(value, t, healthKeys));
}

export function translateDecisionImpact(value: string | null | undefined, t: Translator) {
  if (!value) return "";
  return impactKeys[value] ? t(impactKeys[value]) : value;
}

export function getDecisionImpactOptions(t: Translator) {
  return DECISION_IMPACT_VALUES.map((value) => optionFromValue(value, t, impactKeys));
}

export function getRiskScoreOptions(t: Translator) {
  return RISK_SCORE_VALUES.map((value) => optionFromValue(value, t, riskScoreKeys));
}

export function translateRiskAssessmentType(
  value: string | null | undefined,
  t: Translator
) {
  if (!value) return "";
  return riskAssessmentTypeKeys[value] ? t(riskAssessmentTypeKeys[value]) : value;
}

export function getRiskAssessmentTypeOptions(t: Translator) {
  return RISK_ASSESSMENT_TYPE_VALUES.map((value) =>
    optionFromValue(value, t, riskAssessmentTypeKeys)
  );
}

export function translateReportingPackStatus(
  value: string | null | undefined,
  t: Translator
) {
  if (!value) return "";
  return reportingPackStatusKeys[value] ? t(reportingPackStatusKeys[value]) : value;
}

export function getReportingPackStatusOptions(t: Translator) {
  return Object.keys(reportingPackStatusKeys).map((value) =>
    optionFromValue(value, t, reportingPackStatusKeys)
  );
}

export function translateConfiguredOption(
  option: ConfiguredDisplayOption | null | undefined,
  locale: AppLocale,
  t: Translator,
  namespace?: ConfiguredNamespace
) {
  if (!option) return "";

  const code = option.code ?? "";
  const translatedKey = namespace && code ? configuredValueKeys[namespace][code] : undefined;
  if (translatedKey) return t(translatedKey);

  if (locale === "es" && option.nameEs) return option.nameEs;

  return option.name ?? code;
}

export function hasConfiguredTranslation(
  namespace: ConfiguredNamespace,
  code: string | null | undefined
) {
  return Boolean(code && configuredValueKeys[namespace][code]);
}

export function getConfiguredOptions<T extends ConfiguredDisplayOption & { id: string }>(
  options: T[],
  locale: AppLocale,
  t: Translator,
  namespace?: ConfiguredNamespace
) {
  return options.map((option) => ({
    value: option.id,
    label: translateConfiguredOption(option, locale, t, namespace),
  }));
}

export function translateRiskLifecycleStage(
  value: string | null | undefined,
  t: Translator
) {
  if (!value) return "";
  return riskLifecycleStageKeys[value] ? t(riskLifecycleStageKeys[value]) : value;
}
