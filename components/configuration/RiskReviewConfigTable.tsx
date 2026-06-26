"use client";

import { TranslatedButtonLabel } from "@/components/ui/TranslatedControls";
import { useState } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import { tableStyle, tdStyle, thStyle } from "@/components/ui/tableStyles";
import { useActionToast } from "@/components/ui/useActionToast";
import type { RiskReviewConfigActionResult } from "@/lib/domain/riskReviewConfig/riskReviewConfigTypes";

type FlagDefinition = {
  key: string;
  label: string;
};

type RiskReviewConfigRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  reviewCount: number;
} & Record<string, string | number | boolean | null>;

type ActionHandler = (
  formData: FormData
) => Promise<RiskReviewConfigActionResult | undefined>;

type ClientActionHandler = (formData: FormData) => Promise<void>;

export function RiskReviewConfigTable({
  title,
  createLabel,
  rows,
  flags,
  createAction,
  updateAction,
  toggleAction,
  deleteAction,
}: {
  title: string;
  createLabel: string;
  rows: RiskReviewConfigRow[];
  flags: FlagDefinition[];
  createAction: ActionHandler;
  updateAction: ActionHandler;
  toggleAction: ActionHandler;
  deleteAction: ActionHandler;
}) {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();
  const formId = `create-${title.toLowerCase().replace(/\s+/g, "-")}`;

  async function handleCreate(formData: FormData) {
    await handleAction(createAction, formData, () => setIsCreating(false));
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updateAction, formData);
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleAction, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteAction, formData);
  }

  return (
    <>
      <SectionHeader
        title={title}
        action={
          <AddActionButton type="button" onClick={() => setIsCreating(true)}>
            {createLabel}
          </AddActionButton>
        }
      />

      <form id={formId} action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t("labels.code")}</th>
            <th style={thStyle}>{t("labels.name")}</th>
            <th style={thStyle}>{t("labels.description")}</th>
            <th style={thStyle}>{t("labels.sort")}</th>
            {flags.map((flag) => (
              <th key={flag.key} style={thStyle}>
                {flag.label}
              </th>
            ))}
            <th style={thStyle}>{t("labels.active")}</th>
            <th style={thStyle}>{t("labels.reviews")}</th>
            <th style={thStyle}>{t("labels.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>
                <input
                  name="code"
                  required
                  style={inputStyle}
                  form={formId}
                  autoComplete="off"
                />
              </td>
              <td style={tdStyle}>
                <input
                  name="name"
                  required
                  style={inputStyle}
                  form={formId}
                  autoComplete="off"
                />
              </td>
              <td style={tdStyle}>
                <input
                  name="description"
                  style={inputStyle}
                  form={formId}
                  autoComplete="off"
                />
              </td>
              <td style={tdStyle}>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={100}
                  style={{ ...inputStyle, width: 80 }}
                  form={formId}
                />
              </td>
              {flags.map((flag) => (
                <td key={flag.key} style={tdStyle}>
                  <input
                    type="checkbox"
                    name={flag.key}
                    value="true"
                    form={formId}
                  />
                </td>
              ))}
              <td style={tdStyle}>{t("labels.new")}</td>
              <td style={tdStyle}>0</td>
              <td style={tdStyle}>
                <button type="submit" form={formId} style={tableButtonStyle}>
                  <TranslatedButtonLabel labelKey="actions.save" />
                </button>{" "}
                <button
                  type="button"
                  style={tableButtonStyle}
                  onClick={() => setIsCreating(false)}
                >
                  <TranslatedButtonLabel labelKey="actions.cancel" />
                </button>
              </td>
            </tr>
          )}

          {rows.map((row) => (
            <RiskReviewConfigRow
              key={row.id}
              row={row}
              flags={flags}
              handleUpdate={handleUpdate}
              handleToggle={handleToggle}
              handleDelete={handleDelete}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}

function RiskReviewConfigRow({
  row,
  flags,
  handleUpdate,
  handleToggle,
  handleDelete,
}: {
  row: RiskReviewConfigRow;
  flags: FlagDefinition[];
  handleUpdate: ClientActionHandler;
  handleToggle: ClientActionHandler;
  handleDelete: ClientActionHandler;
}) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => buildDraft(row, flags));

  function resetDraft() {
    setDraft(buildDraft(row, flags));
  }

  return (
    <tr>
      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={String(draft.code)}
            onChange={(event) =>
              setDraft({ ...draft, code: event.target.value.toUpperCase() })
            }
            style={inputStyle}
          />
        ) : (
          row.code
        )}
      </td>
      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={String(draft.name)}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            style={inputStyle}
          />
        ) : (
          row.name
        )}
      </td>
      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={String(draft.description)}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
            style={inputStyle}
          />
        ) : (
          row.description || "-"
        )}
      </td>
      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="number"
            value={Number(draft.sortOrder)}
            onChange={(event) =>
              setDraft({ ...draft, sortOrder: Number(event.target.value || 100) })
            }
            style={{ ...inputStyle, width: 80 }}
          />
        ) : (
          row.sortOrder
        )}
      </td>
      {flags.map((flag) => (
        <td key={flag.key} style={tdStyle}>
          {isEditing ? (
            <input
              type="checkbox"
              checked={Boolean(draft[flag.key])}
              onChange={(event) =>
                setDraft({ ...draft, [flag.key]: event.target.checked })
              }
            />
          ) : Boolean(row[flag.key]) ? (
            t("labels.yes")
          ) : (
            "-"
          )}
        </td>
      ))}
      <td style={tdStyle}>{row.isActive ? t("labels.active") : t("labels.inactive")}</td>
      <td style={tdStyle}>{row.reviewCount}</td>
      <td style={tdStyle}>
        {isEditing ? (
          <>
            <form action={handleUpdate} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="code" value={String(draft.code)} />
              <input type="hidden" name="name" value={String(draft.name)} />
              <input
                type="hidden"
                name="description"
                value={String(draft.description)}
              />
              <input
                type="hidden"
                name="sortOrder"
                value={String(draft.sortOrder)}
              />
              {flags.map((flag) => (
                <input
                  key={flag.key}
                  type="hidden"
                  name={flag.key}
                  value={draft[flag.key] ? "true" : ""}
                />
              ))}
              <button type="submit" style={tableButtonStyle}>
                <TranslatedButtonLabel labelKey="actions.save" />
              </button>
            </form>{" "}
            <button
              type="button"
              style={tableButtonStyle}
              onClick={() => {
                resetDraft();
                setIsEditing(false);
              }}
            >
              <TranslatedButtonLabel labelKey="actions.cancel" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              style={tableButtonStyle}
              onClick={() => setIsEditing(true)}
            >
              <TranslatedButtonLabel labelKey="actions.edit" />
            </button>{" "}
            <form action={handleToggle} style={{ margin: 0, display: "inline" }}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="current" value={String(row.isActive)} />
              <button type="submit" style={tableButtonStyle}>
                {<TranslatedButtonLabel labelKey={row.isActive ? "actions.deactivate" : "actions.activate"} />}
              </button>
            </form>{" "}
            <form action={handleDelete} style={{ margin: 0, display: "inline" }}>
              <input type="hidden" name="id" value={row.id} />
              <button type="submit" style={tableButtonStyle}>
                <TranslatedButtonLabel labelKey="actions.delete" />
              </button>
            </form>
          </>
        )}
      </td>
    </tr>
  );
}

function buildDraft(row: RiskReviewConfigRow, flags: FlagDefinition[]) {
  return {
    code: row.code,
    name: row.name,
    description: row.description ?? "",
    sortOrder: row.sortOrder,
    ...Object.fromEntries(flags.map((flag) => [flag.key, Boolean(row[flag.key])])),
  } as Record<string, string | number | boolean>;
}
