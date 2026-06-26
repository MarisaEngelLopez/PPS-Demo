"use client";

import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import type {
  StatusActionResult,
  StatusReferenceCounts,
} from "@/lib/domain/statuses/statusTypes";

type StatusAdminRow = {
  id: string;
  code: string;
  name: string;
  nameEs: string | null;
  sortOrder: number;
  isActive: boolean;
  referenceCounts?: StatusReferenceCounts;
};

type ActionHandler = (
  formData: FormData
) => Promise<StatusActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

function getTotalReferences(status: StatusAdminRow) {
  const counts = status.referenceCounts;
  if (!counts) return 0;

  return (Object.values(counts) as number[]).reduce(
    (total, count) => total + Number(count || 0),
    0
  );
}

export function StatusesTable({
  statuses,
  createStatus,
  updateStatus,
  toggleActive,
  deleteStatus,
}: {
  statuses: StatusAdminRow[];
  createStatus: ActionHandler;
  updateStatus: ActionHandler;
  toggleActive: ActionHandler;
  deleteStatus: ActionHandler;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(createStatus, formData, () => setIsCreating(false));
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updateStatus, formData);
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleActive, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteStatus, formData);
  }

  return (
    <>
      <SectionHeader
        title={<TranslatedText labelKey="labels.status" />}
        action={
          <AddActionButton onClick={() => setIsCreating(true)}>
            <TranslatedText labelKey="actions.newStatus" />
          </AddActionButton>
        }
      />

      <form id="create-status-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.code" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.name" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.sort" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.active" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.references" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.actions" /></th>
          </tr>
        </thead>

        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>
                <input
                  name="code"
                  required
                  placeholder="CODE"
                  style={inputStyle}
                  form="create-status-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="name"
                  required
                  placeholder="Name"
                  style={inputStyle}
                  form="create-status-form"
                  autoComplete="off"
                />
                <input
                  type="hidden"
                  name="nameEs"
                  value=""
                  form="create-status-form"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={100}
                  style={inputStyle}
                  form="create-status-form"
                />
              </td>

              <td style={tdStyle}><TranslatedText labelKey="labels.new" /></td>
              <td style={tdStyle}>0</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-status-form"
                  style={tableButtonStyle}
                >
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

          {statuses.map((status) => (
            <StatusRow
              key={status.id}
              status={status}
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

function StatusRow({
  status,
  handleUpdate,
  handleToggle,
  handleDelete,
}: {
  status: StatusAdminRow;
  handleUpdate: ClientActionHandler;
  handleToggle: ClientActionHandler;
  handleDelete: ClientActionHandler;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    code: status.code ?? "",
    name: status.name ?? "",
    nameEs: status.nameEs ?? "",
    sortOrder: status.sortOrder ?? 100,
  });
  const totalReferences = getTotalReferences(status);

  function resetDraft() {
    setDraft({
      code: status.code ?? "",
      name: status.name ?? "",
      nameEs: status.nameEs ?? "",
      sortOrder: status.sortOrder ?? 100,
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
            style={inputStyle}
          />
        ) : (
          status.code
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            style={inputStyle}
          />
        ) : (
          status.name
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="number"
            value={draft.sortOrder}
            onChange={(e) =>
              setDraft({ ...draft, sortOrder: Number(e.target.value || 100) })
            }
            style={{ ...inputStyle, width: 80 }}
          />
        ) : (
          status.sortOrder
        )}
      </td>

      <td style={tdStyle}>
        <TranslatedText labelKey={status.isActive ? "labels.active" : "labels.inactive"} />
      </td>
      <td style={tdStyle}>{totalReferences}</td>

      <td style={tdStyle}>
        {isEditing ? (
          <>
            <form action={handleUpdate} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={status.id} />
              <input type="hidden" name="code" value={draft.code} />
              <input type="hidden" name="name" value={draft.name} />
              <input type="hidden" name="nameEs" value={draft.nameEs} />
              <input type="hidden" name="sortOrder" value={draft.sortOrder} />
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
              <input type="hidden" name="id" value={status.id} />
              <input
                type="hidden"
                name="current"
                value={String(status.isActive)}
              />
              <button type="submit" style={tableButtonStyle}>
                {<TranslatedButtonLabel labelKey={status.isActive ? "actions.deactivate" : "actions.activate"} />}
              </button>
            </form>{" "}
            <form action={handleDelete} style={{ margin: 0, display: "inline" }}>
              <input type="hidden" name="id" value={status.id} />
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
