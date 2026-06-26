"use client";

import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import { compactInputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import type { StatusActionResult } from "@/lib/domain/statuses/statusTypes";

type StatusScopeRowData = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  inheritDefault: boolean;
  isActive: boolean;
};

type ActionHandler = (
  formData: FormData
) => Promise<StatusActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

export function StatusScopesTable({
  scopes,
  saveStatusScope,
  updateStatusScope,
  deleteStatusScope,
}: {
  scopes: StatusScopeRowData[];
  saveStatusScope: ActionHandler;
  updateStatusScope: ActionHandler;
  deleteStatusScope: ActionHandler;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(saveStatusScope, formData, () => setIsCreating(false));
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updateStatusScope, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteStatusScope, formData);
  }

  return (
    <>
      <SectionHeader
        title={<TranslatedText labelKey="admin.statusScopes.title" />}
        action={
          !isCreating ? (
            <AddActionButton onClick={() => setIsCreating(true)}>
              <TranslatedText labelKey="actions.newStatusScope" />
            </AddActionButton>
          ) : null
        }
      />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.code" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.name" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.sort" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.inheritDefault" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.active" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.actions" /></th>
          </tr>
        </thead>

        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>
                <input
                  name="code"
                  form="create-status-scope-form"
                  placeholder="Code"
                  required
                  style={compactInputStyle}
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="name"
                  form="create-status-scope-form"
                  placeholder="Name"
                  required
                  style={compactInputStyle}
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="sortOrder"
                  form="create-status-scope-form"
                  type="number"
                  defaultValue={100}
                  style={{ ...compactInputStyle, width: 80 }}
                />
              </td>

              <td style={tdStyle}>
                <input
                  type="hidden"
                  name="inheritDefault"
                  form="create-status-scope-form"
                  defaultValue="false"
                />
                <input
                  type="checkbox"
                  name="inheritDefault"
                  form="create-status-scope-form"
                  defaultValue="true"
                  defaultChecked
                />
              </td>

              <td style={tdStyle}>
                <input
                  type="hidden"
                  name="isActive"
                  form="create-status-scope-form"
                  defaultValue="false"
                />
                <input
                  type="checkbox"
                  name="isActive"
                  form="create-status-scope-form"
                  defaultValue="true"
                  defaultChecked
                />
              </td>

              <td style={tdStyle}>
                <form id="create-status-scope-form" action={handleCreate}>
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

          {scopes.map((scope) => (
            <StatusScopeRow
              key={scope.id}
              scope={scope}
              updateStatusScope={handleUpdate}
              deleteStatusScope={handleDelete}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}

function StatusScopeRow({
  scope,
  updateStatusScope,
  deleteStatusScope,
}: {
  scope: StatusScopeRowData;
  updateStatusScope: ClientActionHandler;
  deleteStatusScope: ClientActionHandler;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const [draft, setDraft] = useState({
    code: scope.code ?? "",
    name: scope.name ?? "",
    sortOrder: scope.sortOrder ?? 100,
    inheritDefault: Boolean(scope.inheritDefault),
    isActive: Boolean(scope.isActive),
  });

  function resetDraft() {
    setDraft({
      code: scope.code ?? "",
      name: scope.name ?? "",
      sortOrder: scope.sortOrder ?? 100,
      inheritDefault: Boolean(scope.inheritDefault),
      isActive: Boolean(scope.isActive),
    });
  }

  return (
    <tr>
      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={draft.code}
            onChange={(e) =>
              setDraft({ ...draft, code: e.target.value.toUpperCase() })
            }
            style={compactInputStyle}
          />
        ) : (
          scope.code
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            style={compactInputStyle}
          />
        ) : (
          scope.name
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="number"
            value={draft.sortOrder}
            onChange={(e) =>
              setDraft({
                ...draft,
                sortOrder: Number(e.target.value || 100),
              })
            }
            style={{ ...compactInputStyle, width: 80 }}
          />
        ) : (
          scope.sortOrder
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="checkbox"
            checked={draft.inheritDefault}
            onChange={(e) =>
              setDraft({ ...draft, inheritDefault: e.target.checked })
            }
          />
        ) : scope.inheritDefault ? (
          "Yes"
        ) : (
          "No"
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) =>
              setDraft({ ...draft, isActive: e.target.checked })
            }
          />
        ) : scope.isActive ? (
          "Active"
        ) : (
          "Inactive"
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <>
            <form action={updateStatusScope} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={scope.id} />
              <input type="hidden" name="code" value={draft.code} />
              <input type="hidden" name="name" value={draft.name} />
              <input
                type="hidden"
                name="sortOrder"
                value={draft.sortOrder}
              />
              <input
                type="hidden"
                name="inheritDefault"
                value={draft.inheritDefault ? "true" : "false"}
              />
              <input
                type="hidden"
                name="isActive"
                value={draft.isActive ? "true" : "false"}
              />

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

            <form action={deleteStatusScope} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={scope.id} />
              <button type="submit" style={tableButtonStyle}>
                {<TranslatedButtonLabel labelKey={scope.isActive ? "actions.deactivate" : "actions.delete"} />}
              </button>
            </form>
          </>
        )}
      </td>
    </tr>
  );
}
