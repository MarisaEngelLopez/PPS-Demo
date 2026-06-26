"use client";

import { Fragment, useState, type FormEvent } from "react";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  inputStyle,
  labelStyle,
  highlightedSectionPanelStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import {
  StandardTable,
  TableActionGroup,
  TableEmptyRow,
} from "@/components/ui/TablePrimitives";
import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { tdStyle, thStyle } from "@/components/ui/tableStyles";
import { useActionToast } from "@/components/ui/useActionToast";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import {
  getExecutiveIntelligenceCategoryOptions,
  getExecutiveIntelligenceConfidenceOptions,
  getExecutiveIntelligenceSensitivityOptions,
  getExecutiveIntelligenceVisibilityOptions,
  translateExecutiveIntelligenceCategory,
  translateExecutiveIntelligenceConfidence,
  translateExecutiveIntelligenceSensitivity,
  translateExecutiveIntelligenceVisibility,
} from "@/lib/domain/executiveIntelligence/executiveIntelligenceContract";
import type { ExecutiveIntelligenceActionResult } from "@/app/knowledge/executive-intelligence/actions";

type ActionHandler = (
  formData: FormData
) => Promise<ExecutiveIntelligenceActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

type OrganizationOption = {
  id: string;
  name: string;
  displayName: string | null;
};

type ContactOption = {
  id: string;
  organizationId: string;
  name: string;
  roleTitle: string | null;
  organization: OrganizationOption;
};

type UserOption = {
  id: string;
  fullName: string;
};

type ExecutiveIntelligenceRowData = {
  id: string;
  organizationId: string;
  contactId: string | null;
  category: string;
  sensitivity: string;
  confidence: string;
  note: string;
  source: string | null;
  visibility: string;
  lastReviewed: Date | string | null;
  organization: OrganizationOption;
  contact: ContactOption | null;
};

type ExecutiveIntelligenceTableProps = {
  items: ExecutiveIntelligenceRowData[];
  organizations: OrganizationOption[];
  contacts: ContactOption[];
  users: UserOption[];
  createExecutiveIntelligence: ActionHandler;
  updateExecutiveIntelligence: ActionHandler;
  deleteExecutiveIntelligence: ActionHandler;
};

function dateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function organizationLabel(organization: OrganizationOption) {
  return organization.displayName || organization.name;
}

function contactLabel(contact: ContactOption) {
  const role = contact.roleTitle ? ` (${contact.roleTitle})` : "";
  return `${organizationLabel(contact.organization)} / ${contact.name}${role}`;
}

const LAST_EXECUTIVE_INTELLIGENCE_ORGANIZATION_KEY =
  "lastExecutiveIntelligenceOrganizationId";

function getLastOrganizationId(organizations: OrganizationOption[]) {
  if (typeof window === "undefined") return organizations[0]?.id ?? "";
  const stored = localStorage.getItem(LAST_EXECUTIVE_INTELLIGENCE_ORGANIZATION_KEY);
  return organizations.some((organization) => organization.id === stored)
    ? stored ?? ""
    : organizations[0]?.id ?? "";
}

export function ExecutiveIntelligenceTable({
  items,
  organizations,
  contacts,
  users,
  createExecutiveIntelligence,
  updateExecutiveIntelligence,
  deleteExecutiveIntelligence,
}: ExecutiveIntelligenceTableProps) {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    const organizationId = String(formData.get("organizationId") || "");
    if (organizationId) {
      localStorage.setItem(LAST_EXECUTIVE_INTELLIGENCE_ORGANIZATION_KEY, organizationId);
    }
    await handleAction(createExecutiveIntelligence, formData, () => setIsCreating(false));
  }

  async function handleUpdate(formData: FormData) {
    const organizationId = String(formData.get("organizationId") || "");
    if (organizationId) {
      localStorage.setItem(LAST_EXECUTIVE_INTELLIGENCE_ORGANIZATION_KEY, organizationId);
    }
    await handleAction(updateExecutiveIntelligence, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteExecutiveIntelligence, formData);
  }

  return (
    <>
      <SectionHeader
        title={t("executiveIntelligence.title")}
        action={
          <AddActionButton onClick={() => setIsCreating(true)}>
            {t("executiveIntelligence.newItem")}
          </AddActionButton>
        }
      />

      <div style={{ ...highlightedSectionPanelStyle, marginBottom: "1rem", color: "#334155" }}>
        {t("executiveIntelligence.restrictedNotice")}
      </div>

      <StandardTable>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.note" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.category" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.sensitivity" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.confidence" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.visibility" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.actions" /></th>
          </tr>
        </thead>
        <tbody>
          {isCreating && (
            <ExecutiveIntelligenceEditorRow
              organizations={organizations}
              contacts={contacts}
              users={users}
              action={handleCreate}
              onCancel={() => setIsCreating(false)}
            />
          )}
          {items.map((item) => {
            const isExpanded = expandedItemId === item.id;
            return (
              <Fragment key={item.id}>
                <tr id={`executive-intelligence-${item.id}`}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{item.note}</td>
                  <td style={tdStyle}>{translateExecutiveIntelligenceCategory(item.category, t)}</td>
                  <td style={tdStyle}>
                    {translateExecutiveIntelligenceSensitivity(item.sensitivity, t)}
                  </td>
                  <td style={tdStyle}>
                    {translateExecutiveIntelligenceConfidence(item.confidence, t)}
                  </td>
                  <td style={tdStyle}>
                    {translateExecutiveIntelligenceVisibility(item.visibility, t)}
                  </td>
                  <td style={tdStyle}>
                    <TableActionGroup>
                      <button
                        type="button"
                        style={tableButtonStyle}
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                      >
                        <TranslatedButtonLabel
                          labelKey={isExpanded ? "actions.close" : "actions.details"}
                        />
                      </button>
                    </TableActionGroup>
                  </td>
                </tr>
                {isExpanded && (
                  <ExecutiveIntelligenceEditorRow
                    key={`${item.id}-details`}
                    item={item}
                    organizations={organizations}
                    contacts={contacts}
                    users={users}
                    action={handleUpdate}
                    deleteAction={handleDelete}
                  />
                )}
              </Fragment>
            );
          })}
          {items.length === 0 && !isCreating && (
            <TableEmptyRow colSpan={6}>{t("executiveIntelligence.empty")}</TableEmptyRow>
          )}
        </tbody>
      </StandardTable>
    </>
  );
}

function ExecutiveIntelligenceEditorRow({
  item,
  organizations,
  contacts,
  users,
  action,
  deleteAction,
  onCancel,
}: {
  item?: ExecutiveIntelligenceRowData;
  organizations: OrganizationOption[];
  contacts: ContactOption[];
  users: UserOption[];
  action: ClientActionHandler;
  deleteAction?: ClientActionHandler;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const categories = getExecutiveIntelligenceCategoryOptions(t);
  const sensitivities = getExecutiveIntelligenceSensitivityOptions(t);
  const confidences = getExecutiveIntelligenceConfidenceOptions(t);
  const visibilities = getExecutiveIntelligenceVisibilityOptions(t);
  const [organizationId, setOrganizationId] = useState(
    item?.organizationId ?? getLastOrganizationId(organizations)
  );
  const [contactId, setContactId] = useState(item?.contactId ?? "");
  const [category, setCategory] = useState(item?.category ?? "ORGANIZATIONAL_INSIGHT");
  const [sensitivity, setSensitivity] = useState(item?.sensitivity ?? "INTERNAL");
  const [confidence, setConfidence] = useState(item?.confidence ?? "MEDIUM");
  const [visibility, setVisibility] = useState(item?.visibility ?? "RESTRICTED");
  const [note, setNote] = useState(item?.note ?? "");
  const [source, setSource] = useState(item?.source ?? "");
  const [lastReviewed, setLastReviewed] = useState(dateInputValue(item?.lastReviewed));
  const [createdByUserId, setCreatedByUserId] = useState("");
  const filteredContacts = contacts.filter(
    (contact) => !organizationId || contact.organizationId === organizationId
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action(new FormData(event.currentTarget));
  }

  return (
    <tr id={item ? `executive-intelligence-${item.id}` : undefined}>
      <td style={tdStyle} colSpan={6}>
        <form onSubmit={handleSubmit} style={{ margin: 0 }}>
          {item && <input type="hidden" name="id" value={item.id} />}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(180px, 1fr) minmax(180px, 1fr) 160px 130px 110px 150px 120px auto",
              gap: "0.5rem",
              alignItems: "start",
            }}
          >
            <label style={labelStyle}>
              {t("labels.organization")}
              <select
                name="organizationId"
                value={organizationId}
                onChange={(event) => {
                  setOrganizationId(event.target.value);
                  setContactId("");
                }}
                required
                style={inputStyle}
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organizationLabel(organization)}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              {t("labels.contact")}
              <select
                name="contactId"
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
                style={inputStyle}
              >
                <option value="">-</option>
                {filteredContacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contactLabel(contact)}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              {t("labels.category")}
              <select
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                style={inputStyle}
              >
                {categories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              {t("labels.sensitivity")}
              <select
                name="sensitivity"
                value={sensitivity}
                onChange={(event) => setSensitivity(event.target.value)}
                style={inputStyle}
              >
                {sensitivities.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              {t("labels.confidence")}
              <select
                name="confidence"
                value={confidence}
                onChange={(event) => setConfidence(event.target.value)}
                style={inputStyle}
              >
                {confidences.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              {t("labels.visibility")}
              <select
                name="visibility"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value)}
                style={inputStyle}
              >
                {visibilities.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              {t("labels.lastReviewed")}
              <input
                type="date"
                name="lastReviewed"
                value={lastReviewed}
                onChange={(event) => setLastReviewed(event.target.value)}
                style={inputStyle}
              />
            </label>
            <TableActionGroup style={{ alignSelf: "end" }}>
              <button type="submit" style={tableButtonStyle}>
                <TranslatedButtonLabel labelKey="actions.save" />
              </button>
              {onCancel && (
                <button type="button" style={tableButtonStyle} onClick={onCancel}>
                  <TranslatedButtonLabel labelKey="actions.cancel" />
                </button>
              )}
              {item && deleteAction && (
                <button
                  type="button"
                  style={tableButtonStyle}
                  onClick={() => {
                    const formData = new FormData();
                    formData.set("id", item.id);
                    void deleteAction(formData);
                  }}
                >
                  <TranslatedButtonLabel labelKey="actions.delete" />
                </button>
              )}
            </TableActionGroup>
            {!item && (
              <label style={{ ...labelStyle, gridColumn: "1 / 3" }}>
                {t("labels.createdBy")}
                <select
                  name="createdByUserId"
                  value={createdByUserId}
                  onChange={(event) => setCreatedByUserId(event.target.value)}
                  style={inputStyle}
                >
                  <option value="">-</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label style={{ ...labelStyle, gridColumn: item ? "1 / 4" : "3 / 5" }}>
              {t("labels.source")}
              <input
                name="source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              {t("labels.note")}
              <textarea
                name="note"
                required
                value={note}
                onChange={(event) => setNote(event.target.value)}
                style={{ ...inputStyle, minHeight: "54px", marginTop: "0.25rem" }}
              />
            </label>
          </div>
        </form>
      </td>
    </tr>
  );
}
