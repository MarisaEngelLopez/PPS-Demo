import type { TranslationKey } from "@/lib/i18n/dictionaries";

export const EXECUTIVE_INTELLIGENCE_CATEGORIES = [
  "COMMUNICATION_STYLE",
  "DECISION_DRIVER",
  "POLITICAL_INFLUENCE",
  "RELATIONSHIP_HISTORY",
  "RISK_INDICATOR",
  "CONCERN",
  "OPPORTUNITY",
  "REMINDER",
  "ORGANIZATIONAL_INSIGHT",
] as const;

export const EXECUTIVE_INTELLIGENCE_SENSITIVITIES = [
  "INTERNAL",
  "SENSITIVE",
  "CONFIDENTIAL",
  "RESTRICTED",
] as const;

export const EXECUTIVE_INTELLIGENCE_CONFIDENCES = [
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;

export const EXECUTIVE_INTELLIGENCE_VISIBILITIES = [
  "RESTRICTED",
  "PROJECT_LEADERSHIP",
  "ACCOUNT_TEAM",
] as const;

export type ExecutiveIntelligenceCategory =
  (typeof EXECUTIVE_INTELLIGENCE_CATEGORIES)[number];
export type ExecutiveIntelligenceSensitivity =
  (typeof EXECUTIVE_INTELLIGENCE_SENSITIVITIES)[number];
export type ExecutiveIntelligenceConfidence =
  (typeof EXECUTIVE_INTELLIGENCE_CONFIDENCES)[number];
export type ExecutiveIntelligenceVisibility =
  (typeof EXECUTIVE_INTELLIGENCE_VISIBILITIES)[number];

type Translator = (key: TranslationKey) => string;

export const executiveIntelligenceCategoryKeys: Record<
  ExecutiveIntelligenceCategory,
  TranslationKey
> = {
  COMMUNICATION_STYLE: "executiveIntelligence.category.communicationStyle",
  DECISION_DRIVER: "executiveIntelligence.category.decisionDriver",
  POLITICAL_INFLUENCE: "executiveIntelligence.category.politicalInfluence",
  RELATIONSHIP_HISTORY: "executiveIntelligence.category.relationshipHistory",
  RISK_INDICATOR: "executiveIntelligence.category.riskIndicator",
  CONCERN: "executiveIntelligence.category.concern",
  OPPORTUNITY: "executiveIntelligence.category.opportunity",
  REMINDER: "executiveIntelligence.category.reminder",
  ORGANIZATIONAL_INSIGHT: "executiveIntelligence.category.organizationalInsight",
};

export const executiveIntelligenceSensitivityKeys: Record<
  ExecutiveIntelligenceSensitivity,
  TranslationKey
> = {
  INTERNAL: "executiveIntelligence.sensitivity.internal",
  SENSITIVE: "executiveIntelligence.sensitivity.sensitive",
  CONFIDENTIAL: "executiveIntelligence.sensitivity.confidential",
  RESTRICTED: "executiveIntelligence.sensitivity.restricted",
};

export const executiveIntelligenceConfidenceKeys: Record<
  ExecutiveIntelligenceConfidence,
  TranslationKey
> = {
  HIGH: "executiveIntelligence.confidence.high",
  MEDIUM: "executiveIntelligence.confidence.medium",
  LOW: "executiveIntelligence.confidence.low",
};

export const executiveIntelligenceVisibilityKeys: Record<
  ExecutiveIntelligenceVisibility,
  TranslationKey
> = {
  RESTRICTED: "executiveIntelligence.visibility.restricted",
  PROJECT_LEADERSHIP: "executiveIntelligence.visibility.projectLeadership",
  ACCOUNT_TEAM: "executiveIntelligence.visibility.accountTeam",
};

function optionFromValue<T extends string>(
  value: T,
  labels: Record<T, TranslationKey>,
  t: Translator
) {
  return { value, label: t(labels[value]) };
}

export function getExecutiveIntelligenceCategoryOptions(t: Translator) {
  return EXECUTIVE_INTELLIGENCE_CATEGORIES.map((value) =>
    optionFromValue(value, executiveIntelligenceCategoryKeys, t)
  );
}

export function getExecutiveIntelligenceSensitivityOptions(t: Translator) {
  return EXECUTIVE_INTELLIGENCE_SENSITIVITIES.map((value) =>
    optionFromValue(value, executiveIntelligenceSensitivityKeys, t)
  );
}

export function getExecutiveIntelligenceConfidenceOptions(t: Translator) {
  return EXECUTIVE_INTELLIGENCE_CONFIDENCES.map((value) =>
    optionFromValue(value, executiveIntelligenceConfidenceKeys, t)
  );
}

export function getExecutiveIntelligenceVisibilityOptions(t: Translator) {
  return EXECUTIVE_INTELLIGENCE_VISIBILITIES.map((value) =>
    optionFromValue(value, executiveIntelligenceVisibilityKeys, t)
  );
}

export function translateExecutiveIntelligenceCategory(
  value: string | null | undefined,
  t: Translator
) {
  if (
    !value ||
    !EXECUTIVE_INTELLIGENCE_CATEGORIES.includes(value as ExecutiveIntelligenceCategory)
  ) {
    return value ?? "";
  }
  return t(executiveIntelligenceCategoryKeys[value as ExecutiveIntelligenceCategory]);
}

export function translateExecutiveIntelligenceSensitivity(
  value: string | null | undefined,
  t: Translator
) {
  if (
    !value ||
    !EXECUTIVE_INTELLIGENCE_SENSITIVITIES.includes(
      value as ExecutiveIntelligenceSensitivity
    )
  ) {
    return value ?? "";
  }
  return t(
    executiveIntelligenceSensitivityKeys[value as ExecutiveIntelligenceSensitivity]
  );
}

export function translateExecutiveIntelligenceConfidence(
  value: string | null | undefined,
  t: Translator
) {
  if (
    !value ||
    !EXECUTIVE_INTELLIGENCE_CONFIDENCES.includes(
      value as ExecutiveIntelligenceConfidence
    )
  ) {
    return value ?? "";
  }
  return t(executiveIntelligenceConfidenceKeys[value as ExecutiveIntelligenceConfidence]);
}

export function translateExecutiveIntelligenceVisibility(
  value: string | null | undefined,
  t: Translator
) {
  if (
    !value ||
    !EXECUTIVE_INTELLIGENCE_VISIBILITIES.includes(
      value as ExecutiveIntelligenceVisibility
    )
  ) {
    return value ?? "";
  }
  return t(
    executiveIntelligenceVisibilityKeys[value as ExecutiveIntelligenceVisibility]
  );
}
