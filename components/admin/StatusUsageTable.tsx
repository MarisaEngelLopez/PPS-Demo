"use client";

import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { useState, type ReactNode } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import { compactInputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import type { StatusActionResult } from "@/lib/domain/statuses/statusTypes";

type StatusOption = {
  id: string;
  code: string;
  name: string;
};

type StatusScopeOption = {
  id: string;
  code: string;
  name: string;
};

type FlagField =
  | "isDefault"
  | "isActive"
  | "isOpen"
  | "isClosed"
  | "isInProgress"
  | "isAttention"
  | "isPositive"
  | "isNegative";

type FlagDefinition = {
  field: FlagField;
  label: ReactNode;
};

type StatusUsageRowData = {
  id: string;
  statusId: string;
  scopeId: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  isOpen: boolean;
  isClosed: boolean;
  isInProgress: boolean;
  isAttention: boolean;
  isPositive: boolean;
  isNegative: boolean;
  recordCount: number;
  status: StatusOption | null;
  scope: StatusScopeOption | null;
};

type ActionHandler = (
  formData: FormData
) => Promise<StatusActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

export function StatusUsageTable({
  statuses,
  scopes,
  usages,
  saveStatusUsage,
  updateStatusUsage,
  deleteStatusUsage,
}: {
  statuses: StatusOption[];
  scopes: StatusScopeOption[];
  usages: StatusUsageRowData[];
  saveStatusUsage: ActionHandler;
  updateStatusUsage: ActionHandler;
  deleteStatusUsage: ActionHandler;
}) {
  const flags: FlagDefinition[] = [
    { field: "isDefault", label: <TranslatedText labelKey="labels.default" /> },
    { field: "isActive", label: <TranslatedText labelKey="labels.active" /> },
    { field: "isOpen", label: <TranslatedText labelKey="metrics.open" /> },
    { field: "isClosed", label: <TranslatedText labelKey="metrics.closed" /> },
    { field: "isInProgress", label: <TranslatedText labelKey="metrics.inProgress" /> },
    { field: "isAttention", label: <TranslatedText labelKey="metrics.attention" /> },
    { field: "isPositive", label: <TranslatedText labelKey="labels.positive" /> },
    { field: "isNegative", label: <TranslatedText labelKey="labels.negative" /> },
  ];
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(saveStatusUsage, formData, () => setIsCreating(false));
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updateStatusUsage, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteStatusUsage, formData);
  }

  return (
    <>
      <SectionHeader
        title={<TranslatedText labelKey="admin.statusUsage.title" />}
        action={
          !isCreating ? (
            <AddActionButton onClick={() => setIsCreating(true)}>
              <TranslatedText labelKey="actions.newStatusUsage" />
            </AddActionButton>
          ) : null
        }
      />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.scope" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.status" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.sort" /></th>
            {flags.map((flag) => (
              <th key={flag.field} style={thStyle}>
                {flag.label}
              </th>
            ))}
            <th style={thStyle}><TranslatedText labelKey="labels.records" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.actions" /></th>
          </tr>
        </thead>

        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>
                <select
                  name="scopeId"
                  form="create-status-usage-form"
                  required
                  style={compactInputStyle}
                >
                  <option value=""><TranslatedText labelKey="timeTracking.selectScope" /></option>
                  {scopes.map((scope) => (
                    <option key={scope.id} value={scope.id}>
                      {scope.code} - {scope.name}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <select
                  name="statusId"
                  form="create-status-usage-form"
                  required
                  style={compactInputStyle}
                >
                  <option value=""><TranslatedText labelKey="timeTracking.selectStatus" /></option>
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.code} - {status.name}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <input
                  name="sortOrder"
                  form="create-status-usage-form"
                  type="number"
                  defaultValue={100}
                  style={{ ...compactInputStyle, width: 70 }}
                />
              </td>

            {flags.map((flag) => (
                <td key={flag.field} style={tdStyle}>
                  <input
                    type="hidden"
                    name={flag.field}
                    form="create-status-usage-form"
                    defaultValue="false"
                  />
                  <input
                    type="checkbox"
                    name={flag.field}
                    form="create-status-usage-form"
                    defaultValue="true"
                    defaultChecked={flag.field === "isActive"}
                  />
                </td>
              ))}

              <td style={tdStyle}>0</td>

              <td style={tdStyle}>
                <form id="create-status-usage-form" action={handleCreate}>
                  <button type="submit" style={tableButtonStyle}>
                    <TranslatedButtonLabel labelKey="actions.save" />
                  </button>{" "}
                  <button
                    type="button"
                    style={tableButtonStyle}
                    onClick={() => setIsCreating(false)}
                  >
                    <TranslatedButtonLabel labelKey="actions.cancel" />
                  </button>
                </form>
              </td>
            </tr>
          )}

          {usages.map((usage) => (
            <StatusUsageRow
              key={usage.id}
              usage={usage}
              flags={flags}
              updateStatusUsage={handleUpdate}
              deleteStatusUsage={handleDelete}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}

function StatusUsageRow({
  usage,
  flags,
  updateStatusUsage,
  deleteStatusUsage,
}: {
  usage: StatusUsageRowData;
  flags: FlagDefinition[];
  updateStatusUsage: ClientActionHandler;
  deleteStatusUsage: ClientActionHandler;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const [draft, setDraft] = useState({
    sortOrder: usage.sortOrder ?? 100,
    isDefault: Boolean(usage.isDefault),
    isActive: Boolean(usage.isActive),
    isOpen: Boolean(usage.isOpen),
    isClosed: Boolean(usage.isClosed),
    isInProgress: Boolean(usage.isInProgress),
    isAttention: Boolean(usage.isAttention),
    isPositive: Boolean(usage.isPositive),
    isNegative: Boolean(usage.isNegative),
  });

  function resetDraft() {
    setDraft({
      sortOrder: usage.sortOrder ?? 100,
      isDefault: Boolean(usage.isDefault),
      isActive: Boolean(usage.isActive),
      isOpen: Boolean(usage.isOpen),
      isClosed: Boolean(usage.isClosed),
      isInProgress: Boolean(usage.isInProgress),
      isAttention: Boolean(usage.isAttention),
      isPositive: Boolean(usage.isPositive),
      isNegative: Boolean(usage.isNegative),
    });
  }

  return (
    <tr>
      <td style={tdStyle}>{usage.scope?.code}</td>
      <td style={tdStyle}>{usage.status?.name}</td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="number"
            value={draft.sortOrder}
            onChange={(e) =>
              setDraft({ ...draft, sortOrder: Number(e.target.value || 100) })
            }
            style={{ ...compactInputStyle, width: 70 }}
          />
        ) : (
          usage.sortOrder
        )}
      </td>

      {flags.map((flag) => (
        <td key={flag.field} style={tdStyle}>
          {isEditing ? (
            <input
              type="checkbox"
              checked={Boolean(draft[flag.field])}
              onChange={(e) =>
                setDraft({ ...draft, [flag.field]: e.target.checked })
              }
            />
          ) : usage[flag.field] ? (
            <TranslatedText labelKey="labels.yes" />
          ) : (
            ""
          )}
        </td>
      ))}

      <td style={tdStyle}>{usage.recordCount}</td>

      <td style={tdStyle}>
        {isEditing ? (
          <>
            <form action={updateStatusUsage} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={usage.id} />
              <input type="hidden" name="statusId" value={usage.statusId} />
              <input type="hidden" name="scopeId" value={usage.scopeId} />
              <input type="hidden" name="sortOrder" value={draft.sortOrder} />

              {flags.map((flag) => (
                <input
                  key={flag.field}
                  type="hidden"
                  name={flag.field}
                  value={draft[flag.field] ? "true" : "false"}
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

            <form action={deleteStatusUsage} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={usage.id} />
              <button type="submit" style={tableButtonStyle}>
                {<TranslatedButtonLabel labelKey={usage.isActive ? "actions.deactivate" : "actions.delete"} />}
              </button>
            </form>
          </>
        )}
      </td>
    </tr>
  );
}
