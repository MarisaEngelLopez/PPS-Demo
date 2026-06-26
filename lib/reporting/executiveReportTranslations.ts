import type { CockpitMetric } from "@/lib/domain/reporting/cockpitMetrics";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { AppLocale } from "@/lib/i18n/locales";
import {
  translateConfiguredOption,
  translateDecisionImpact,
  translateRiskAssessmentType,
  translateRiskLifecycleStage,
} from "@/lib/i18n/displayTranslations";

type Translator = (key: TranslationKey) => string;
type ConfiguredOption = {
  code?: string | null;
  name?: string | null;
  nameEs?: string | null;
};

const metricKeys: Record<string, TranslationKey> = {
  total: "metrics.total",
  open: "metrics.open",
  "in-progress": "metrics.inProgress",
  "on-hold": "metrics.onHold",
  approved: "metrics.approvedClosed",
  closed: "metrics.closed",
  completed: "metrics.completed",
  "due-this-month": "metrics.dueThisMonth",
  overdue: "metrics.overdue",
  "overdue-actions": "metrics.overdueActions",
  escalated: "metrics.escalated",
  red: "metrics.red",
  critical: "metrics.critical",
};

export function getExecutiveReportSectionTitle(
  section: { id: string; title: string },
  t: Translator
) {
  if ("titleKey" in section && section.titleKey) {
    return t(section.titleKey as TranslationKey);
  }

  switch (section.id) {
    case "executive-summary":
      return t("report.executiveSummary");
    case "achievements":
      return t("report.achievements");
    case "issues":
      return t("report.issuesConcerns");
    case "decision-cockpit":
      return t("report.decisionCockpitAttention");
    case "decision-attention":
      return t("report.executiveDecisionAttention");
    case "decision-outcomes":
      return t("report.recentDecisionOutcomes");
    case "risk-cockpit":
      return t("report.riskCockpitAttention");
    case "risk-attention":
      return t("report.riskAttention");
    case "risk-lifecycle-summary":
      return t("sections.riskLifecycleSummary");
    case "risk-management-review":
      return t("report.managementReviewDetail");
    case "workstreams":
      return t("labels.workstreams");
    case "milestones":
      return t("sections.milestones");
    case "gantt-detail":
      return t("report.ganttDetail");
    case "timeline":
      return t("report.timeline");
    case "next-steps":
      return t("report.nextSteps");
    case "management-ask":
      return t("report.managementAsk");
    case "conclusion":
      return t("report.conclusion");
    default:
      return section.title;
  }
}

export function translateCockpitMetrics(
  metrics: CockpitMetric[],
  t: Translator
) {
  return metrics.map((metric) => ({
    ...metric,
    label: metricKeys[metric.key] ? t(metricKeys[metric.key]) : metric.label,
  }));
}

export function translateStatus(
  status: ConfiguredOption | null | undefined,
  locale: AppLocale,
  t: Translator
) {
  return translateConfiguredOption(status, locale, t, "status") || "-";
}

export function translateRiskCategory(
  category: ConfiguredOption | null | undefined,
  locale: AppLocale,
  t: Translator
) {
  return translateConfiguredOption(category, locale, t, "riskCategory") || "-";
}

export function translateEvidenceType(
  evidenceType: ConfiguredOption | null | undefined,
  locale: AppLocale,
  t: Translator
) {
  return translateConfiguredOption(evidenceType, locale, t, "evidenceType") || "-";
}

export function translateRiskReviewType(
  reviewType: ConfiguredOption | null | undefined,
  locale: AppLocale,
  t: Translator
) {
  return translateConfiguredOption(reviewType, locale, t, "riskReviewType") || "-";
}

export function translateRiskReviewOutcome(
  outcome: ConfiguredOption | null | undefined,
  locale: AppLocale,
  t: Translator
) {
  return translateConfiguredOption(outcome, locale, t, "riskReviewOutcome") || "-";
}

export function translateImpact(value: string | null | undefined, t: Translator) {
  return translateDecisionImpact(value, t) || "-";
}

export function translateAssessmentType(
  value: string | null | undefined,
  t: Translator
) {
  return translateRiskAssessmentType(value, t) || "-";
}

export function translateLifecycleStage(
  value: string | null | undefined,
  t: Translator
) {
  return translateRiskLifecycleStage(value, t) || value || "-";
}
