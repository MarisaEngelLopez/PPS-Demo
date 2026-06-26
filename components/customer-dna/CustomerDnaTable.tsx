"use client";

import { Fragment, useState, type FormEvent } from "react";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  inputStyle,
  labelStyle,
  sectionPanelStyle,
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
  getCustomerDnaCategoryOptions,
  getCustomerDnaPriorityOptions,
  getCustomerDnaStatusOptions,
  translateCustomerDnaCategory,
  translateCustomerDnaPriority,
  translateCustomerDnaStatus,
} from "@/lib/domain/customerDna/customerDnaContract";
import type { CustomerDnaActionResult } from "@/app/customer-dna/actions";

type ActionHandler = (
  formData: FormData
) => Promise<CustomerDnaActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

type ProjectOption = {
  id: string;
  projectCode: string;
  name: string;
};

type UserOption = {
  id: string;
  fullName: string;
};

type CustomerDnaRowData = {
  id: string;
  projectId: string;
  category: string;
  priority: string;
  statement: string;
  status: string;
  ownerId: string | null;
  lastReviewed: Date | string | null;
  createdAt: Date | string;
  project: ProjectOption;
  owner: UserOption | null;
};

type CustomerDnaTableProps = {
  items: CustomerDnaRowData[];
  projects: ProjectOption[];
  users: UserOption[];
  createCustomerDna: ActionHandler;
  updateCustomerDna: ActionHandler;
  deleteCustomerDna: ActionHandler;
};

function dateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function projectLabel(project: ProjectOption) {
  return `${project.projectCode} - ${project.name}`;
}

const ALL_PROJECTS = "ALL";
const LAST_CUSTOMER_DNA_PROJECT_KEY = "lastCustomerDnaProjectId";
const CUSTOMER_DNA_PROJECT_FILTER_KEY = "customerDnaProjectFilter";

function getLastProjectId(projects: ProjectOption[]) {
  if (typeof window === "undefined") return projects[0]?.id ?? "";
  const stored = localStorage.getItem(LAST_CUSTOMER_DNA_PROJECT_KEY);
  return projects.some((project) => project.id === stored) ? stored ?? "" : projects[0]?.id ?? "";
}

function getInitialProjectFilter(projects: ProjectOption[]) {
  if (typeof window === "undefined") return ALL_PROJECTS;
  const stored = localStorage.getItem(CUSTOMER_DNA_PROJECT_FILTER_KEY);
  if (stored === ALL_PROJECTS) return ALL_PROJECTS;
  return projects.some((project) => project.id === stored) ? stored ?? ALL_PROJECTS : ALL_PROJECTS;
}

export function CustomerDnaTable({
  items,
  projects,
  users,
  createCustomerDna,
  updateCustomerDna,
  deleteCustomerDna,
}: CustomerDnaTableProps) {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showVerifiedItems, setShowVerifiedItems] = useState(false);
  const [projectFilter, setProjectFilter] = useState(() => getInitialProjectFilter(projects));
  const { handleAction } = useActionToast();
  const filteredItems = items.filter(
    (item) => projectFilter === ALL_PROJECTS || item.projectId === projectFilter
  );
  const activeItems = filteredItems.filter((item) => item.status !== "VERIFIED");
  const verifiedItems = filteredItems.filter((item) => item.status === "VERIFIED");

  async function handleCreate(formData: FormData) {
    const projectId = String(formData.get("projectId") || "");
    if (projectId) localStorage.setItem(LAST_CUSTOMER_DNA_PROJECT_KEY, projectId);
    await handleAction(createCustomerDna, formData, () => setIsCreating(false));
  }

  async function handleUpdate(formData: FormData) {
    const projectId = String(formData.get("projectId") || "");
    if (projectId) localStorage.setItem(LAST_CUSTOMER_DNA_PROJECT_KEY, projectId);
    await handleAction(updateCustomerDna, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteCustomerDna, formData);
  }

  function handleProjectFilterChange(nextProjectId: string) {
    setProjectFilter(nextProjectId);
    localStorage.setItem(CUSTOMER_DNA_PROJECT_FILTER_KEY, nextProjectId);
  }

  return (
    <>
      <SectionHeader
        title={t("customerDna.title")}
        action={
          <AddActionButton onClick={() => setIsCreating(true)}>
            {t("customerDna.newItem")}
          </AddActionButton>
        }
      />

      <div style={{ ...sectionPanelStyle, marginBottom: "1rem", color: "#475569" }}>
        {t("customerDna.description")}
      </div>

      <div
        style={{
          ...sectionPanelStyle,
          display: "grid",
          gridTemplateColumns: "minmax(220px, 360px) auto",
          gap: "0.75rem",
          alignItems: "end",
          marginBottom: "1rem",
        }}
      >
        <label style={labelStyle}>
          {t("labels.project")}
          <select
            value={projectFilter}
            onChange={(event) => handleProjectFilterChange(event.target.value)}
            style={inputStyle}
          >
            <option value={ALL_PROJECTS}>{t("filters.allProjects")}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {projectLabel(project)}
              </option>
            ))}
          </select>
        </label>
        <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
          {t("customerDna.visibleSummary")
            .replace("{active}", String(activeItems.length))
            .replace("{verified}", String(verifiedItems.length))}
        </div>
      </div>

      <StandardTable>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.statement" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.category" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.priority" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.status" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.actions" /></th>
          </tr>
        </thead>
        <tbody>
          {isCreating && (
            <CustomerDnaEditorRow
              projects={projects}
              users={users}
              action={handleCreate}
              onCancel={() => setIsCreating(false)}
            />
          )}
          {activeItems.map((item) => {
            const isExpanded = expandedItemId === item.id;
            return (
              <Fragment key={item.id}>
                <tr id={`customer-dna-${item.id}`}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{item.statement}</td>
                  <td style={tdStyle}>{translateCustomerDnaCategory(item.category, t)}</td>
                  <td style={tdStyle}>{translateCustomerDnaPriority(item.priority, t)}</td>
                  <td style={tdStyle}>{translateCustomerDnaStatus(item.status, t)}</td>
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
                  <CustomerDnaEditorRow
                    key={`${item.id}-details`}
                    item={item}
                    projects={projects}
                    users={users}
                    action={handleUpdate}
                    deleteAction={handleDelete}
                  />
                )}
              </Fragment>
            );
          })}
          {activeItems.length === 0 && !isCreating && (
            <TableEmptyRow colSpan={5}>{t("customerDna.empty")}</TableEmptyRow>
          )}
        </tbody>
      </StandardTable>

      {verifiedItems.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <SectionHeader
            title={`${t("metrics.closed")} / ${t("customerDna.title")}`}
            action={
              <button
                type="button"
                style={tableButtonStyle}
                onClick={() => setShowVerifiedItems((current) => !current)}
              >
                <TranslatedButtonLabel
                  labelKey={showVerifiedItems ? "actions.hide" : "actions.show"}
                />
              </button>
            }
          />
          {showVerifiedItems && (
            <StandardTable>
              <thead>
                <tr>
                  <th style={thStyle}><TranslatedText labelKey="labels.statement" /></th>
                  <th style={thStyle}><TranslatedText labelKey="labels.category" /></th>
                  <th style={thStyle}><TranslatedText labelKey="labels.priority" /></th>
                  <th style={thStyle}><TranslatedText labelKey="labels.status" /></th>
                  <th style={thStyle}><TranslatedText labelKey="labels.actions" /></th>
                </tr>
              </thead>
              <tbody>
                {verifiedItems.map((item) => {
                  const isExpanded = expandedItemId === item.id;
                  return (
                    <Fragment key={item.id}>
                      <tr id={`customer-dna-${item.id}`}>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{item.statement}</td>
                        <td style={tdStyle}>{translateCustomerDnaCategory(item.category, t)}</td>
                        <td style={tdStyle}>{translateCustomerDnaPriority(item.priority, t)}</td>
                        <td style={tdStyle}>{translateCustomerDnaStatus(item.status, t)}</td>
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
                        <CustomerDnaEditorRow
                          key={`${item.id}-details`}
                          item={item}
                          projects={projects}
                          users={users}
                          action={handleUpdate}
                          deleteAction={handleDelete}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </StandardTable>
          )}
        </div>
      )}
    </>
  );
}

function CustomerDnaEditorRow({
  item,
  projects,
  users,
  action,
  deleteAction,
  onCancel,
}: {
  item?: CustomerDnaRowData;
  projects: ProjectOption[];
  users: UserOption[];
  action: ClientActionHandler;
  deleteAction?: ClientActionHandler;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const categories = getCustomerDnaCategoryOptions(t);
  const priorities = getCustomerDnaPriorityOptions(t);
  const statuses = getCustomerDnaStatusOptions(t);
  const [projectId, setProjectId] = useState(
    item?.projectId ?? getLastProjectId(projects)
  );
  const [category, setCategory] = useState(item?.category ?? "STRATEGIC_GOAL");
  const [priority, setPriority] = useState(item?.priority ?? "MEDIUM");
  const [status, setStatus] = useState(item?.status ?? "NOT_ADDRESSED");
  const [ownerId, setOwnerId] = useState(item?.ownerId ?? "");
  const [statement, setStatement] = useState(item?.statement ?? "");
  const [lastReviewed, setLastReviewed] = useState(dateInputValue(item?.lastReviewed));
  const canDelete = Boolean(item && item.status === "NOT_ADDRESSED" && deleteAction);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action(new FormData(event.currentTarget));
  }

  return (
    <tr id={item ? `customer-dna-detail-${item.id}` : undefined}>
      <td style={tdStyle} colSpan={5}>
        <form onSubmit={handleSubmit} style={{ margin: 0 }}>
          {item && <input type="hidden" name="id" value={item.id} />}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(190px, 1.2fr) 160px 120px 130px 150px 140px auto",
              gap: "0.5rem",
              alignItems: "start",
            }}
          >
            <label style={labelStyle}>
              {t("labels.project")}
              <select
                name="projectId"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                required
                style={inputStyle}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {projectLabel(project)}
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
              {t("labels.priority")}
              <select
                name="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                style={inputStyle}
              >
                {priorities.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              {t("labels.status")}
              <select
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                style={inputStyle}
              >
                {statuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              {t("labels.owner")}
              <select
                name="ownerId"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
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
              {canDelete && item && deleteAction && (
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
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              {t("labels.statement")}
              <textarea
                name="statement"
                required
                value={statement}
                onChange={(event) => setStatement(event.target.value)}
                style={{ ...inputStyle, minHeight: "54px", marginTop: "0.25rem" }}
              />
            </label>
          </div>
        </form>
      </td>
    </tr>
  );
}
