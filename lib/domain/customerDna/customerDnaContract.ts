import type { TranslationKey } from "@/lib/i18n/dictionaries";

export const CUSTOMER_DNA_CATEGORIES = [
  "STRATEGIC_GOAL",
  "PAIN_POINT",
  "FEAR",
  "CONSTRAINT",
  "SUCCESS_CRITERIA",
  "EXECUTIVE_COMMENT",
] as const;

export const CUSTOMER_DNA_PRIORITIES = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;

export const CUSTOMER_DNA_STATUSES = [
  "NOT_ADDRESSED",
  "IN_PROGRESS",
  "VERIFIED",
  "AT_RISK",
] as const;

export type CustomerDnaCategory = (typeof CUSTOMER_DNA_CATEGORIES)[number];
export type CustomerDnaPriority = (typeof CUSTOMER_DNA_PRIORITIES)[number];
export type CustomerDnaStatus = (typeof CUSTOMER_DNA_STATUSES)[number];

type Translator = (key: TranslationKey) => string;

export const customerDnaCategoryKeys: Record<CustomerDnaCategory, TranslationKey> = {
  STRATEGIC_GOAL: "customerDna.category.strategicGoal",
  PAIN_POINT: "customerDna.category.painPoint",
  FEAR: "customerDna.category.fear",
  CONSTRAINT: "customerDna.category.constraint",
  SUCCESS_CRITERIA: "customerDna.category.successCriteria",
  EXECUTIVE_COMMENT: "customerDna.category.executiveComment",
};

export const customerDnaPriorityKeys: Record<CustomerDnaPriority, TranslationKey> = {
  CRITICAL: "customerDna.priority.critical",
  HIGH: "customerDna.priority.high",
  MEDIUM: "customerDna.priority.medium",
  LOW: "customerDna.priority.low",
};

export const customerDnaStatusKeys: Record<CustomerDnaStatus, TranslationKey> = {
  NOT_ADDRESSED: "customerDna.status.notAddressed",
  IN_PROGRESS: "customerDna.status.inProgress",
  VERIFIED: "customerDna.status.verified",
  AT_RISK: "customerDna.status.atRisk",
};

function optionFromValue<T extends string>(
  value: T,
  labels: Record<T, TranslationKey>,
  t: Translator
) {
  return { value, label: t(labels[value]) };
}

export function getCustomerDnaCategoryOptions(t: Translator) {
  return CUSTOMER_DNA_CATEGORIES.map((value) =>
    optionFromValue(value, customerDnaCategoryKeys, t)
  );
}

export function getCustomerDnaPriorityOptions(t: Translator) {
  return CUSTOMER_DNA_PRIORITIES.map((value) =>
    optionFromValue(value, customerDnaPriorityKeys, t)
  );
}

export function getCustomerDnaStatusOptions(t: Translator) {
  return CUSTOMER_DNA_STATUSES.map((value) =>
    optionFromValue(value, customerDnaStatusKeys, t)
  );
}

export function translateCustomerDnaCategory(
  value: string | null | undefined,
  t: Translator
) {
  if (!value || !CUSTOMER_DNA_CATEGORIES.includes(value as CustomerDnaCategory)) return value ?? "";
  return t(customerDnaCategoryKeys[value as CustomerDnaCategory]);
}

export function translateCustomerDnaPriority(
  value: string | null | undefined,
  t: Translator
) {
  if (!value || !CUSTOMER_DNA_PRIORITIES.includes(value as CustomerDnaPriority)) return value ?? "";
  return t(customerDnaPriorityKeys[value as CustomerDnaPriority]);
}

export function translateCustomerDnaStatus(
  value: string | null | undefined,
  t: Translator
) {
  if (!value || !CUSTOMER_DNA_STATUSES.includes(value as CustomerDnaStatus)) return value ?? "";
  return t(customerDnaStatusKeys[value as CustomerDnaStatus]);
}
