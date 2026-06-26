"use client";

import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { useState } from "react";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import { tableStyle, tdStyle, thStyle } from "@/components/ui/tableStyles";
import { useActionToast } from "@/components/ui/useActionToast";
import type {
  EvidenceTypeActionResult,
  EvidenceTypeAdminRow,
} from "@/lib/domain/evidenceTypes/evidenceTypeTypes";

type ActionHandler = (
  formData: FormData
) => Promise<EvidenceTypeActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

export function EvidenceTypesTable({
  evidenceTypes,
  createEvidenceType,
  updateEvidenceType,
  toggleEvidenceType,
  deleteEvidenceType,
}: {
  evidenceTypes: EvidenceTypeAdminRow[];
  createEvidenceType: ActionHandler;
  updateEvidenceType: ActionHandler;
  toggleEvidenceType: ActionHandler;
  deleteEvidenceType: ActionHandler;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(createEvidenceType, formData, () =>
      setIsCreating(false)
    );
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updateEvidenceType, formData);
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleEvidenceType, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteEvidenceType, formData);
  }

  return (
    <>
      <SectionHeader
        title={<TranslatedText labelKey="sections.evidenceRecords" />}
        action={
          <AddActionButton onClick={() => setIsCreating(true)}>
            <TranslatedText labelKey="actions.newEvidenceType" />
          </AddActionButton>
        }
      />

      <form id="create-evidence-type-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.code" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.name" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.description" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.sort" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.active" /></th>
            <th style={thStyle}><TranslatedText labelKey="sections.evidenceRecords" /></th>
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
                  placeholder="DOCUMENT"
                  style={inputStyle}
                  form="create-evidence-type-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="name"
                  required
                  placeholder="Document"
                  style={inputStyle}
                  form="create-evidence-type-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="description"
                  placeholder="Description"
                  style={inputStyle}
                  form="create-evidence-type-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={100}
                  style={inputStyle}
                  form="create-evidence-type-form"
                />
              </td>

              <td style={tdStyle}><TranslatedText labelKey="labels.new" /></td>
              <td style={tdStyle}>0</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-evidence-type-form"
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

          {evidenceTypes.map((evidenceType) => (
            <EvidenceTypeRow
              key={evidenceType.id}
              evidenceType={evidenceType}
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

function EvidenceTypeRow({
  evidenceType,
  handleUpdate,
  handleToggle,
  handleDelete,
}: {
  evidenceType: EvidenceTypeAdminRow;
  handleUpdate: ClientActionHandler;
  handleToggle: ClientActionHandler;
  handleDelete: ClientActionHandler;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    code: evidenceType.code ?? "",
    name: evidenceType.name ?? "",
    description: evidenceType.description ?? "",
    sortOrder: evidenceType.sortOrder ?? 100,
  });

  function resetDraft() {
    setDraft({
      code: evidenceType.code ?? "",
      name: evidenceType.name ?? "",
      description: evidenceType.description ?? "",
      sortOrder: evidenceType.sortOrder ?? 100,
    });
  }

  return (
    <tr>
      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={draft.code}
            onChange={(event) =>
              setDraft({ ...draft, code: event.target.value.toUpperCase() })
            }
            style={inputStyle}
          />
        ) : (
          evidenceType.code
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={draft.name}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
            style={inputStyle}
          />
        ) : (
          evidenceType.name
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={draft.description}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
            style={inputStyle}
          />
        ) : (
          evidenceType.description || "-"
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="number"
            value={draft.sortOrder}
            onChange={(event) =>
              setDraft({
                ...draft,
                sortOrder: Number(event.target.value || 100),
              })
            }
            style={{ ...inputStyle, width: 80 }}
          />
        ) : (
          evidenceType.sortOrder
        )}
      </td>

      <td style={tdStyle}>{evidenceType.isActive ? "Active" : "Inactive"}</td>
      <td style={tdStyle}>{evidenceType.evidenceCount}</td>

      <td style={tdStyle}>
        {isEditing ? (
          <>
            <form action={handleUpdate} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={evidenceType.id} />
              <input type="hidden" name="code" value={draft.code} />
              <input type="hidden" name="name" value={draft.name} />
              <input
                type="hidden"
                name="description"
                value={draft.description}
              />
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
              <input type="hidden" name="id" value={evidenceType.id} />
              <input
                type="hidden"
                name="current"
                value={String(evidenceType.isActive)}
              />
              <button type="submit" style={tableButtonStyle}>
                {<TranslatedButtonLabel labelKey={evidenceType.isActive ? "actions.deactivate" : "actions.activate"} />}
              </button>
            </form>{" "}
            <form action={handleDelete} style={{ margin: 0, display: "inline" }}>
              <input type="hidden" name="id" value={evidenceType.id} />
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
