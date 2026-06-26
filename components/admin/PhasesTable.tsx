"use client";

import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import type { PhaseActionResult, PhaseAdminRow } from "@/lib/domain/phases/phaseTypes";

type ActionHandler = (
  formData: FormData
) => Promise<PhaseActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

export function PhasesTable({
  phases,
  createPhase,
  updatePhase,
  togglePhase,
  deletePhase,
}: {
  phases: PhaseAdminRow[];
  createPhase: ActionHandler;
  updatePhase: ActionHandler;
  togglePhase: ActionHandler;
  deletePhase: ActionHandler;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(createPhase, formData, () => setIsCreating(false));
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updatePhase, formData);
  }

  async function handleToggle(formData: FormData) {
    await handleAction(togglePhase, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deletePhase, formData);
  }

  return (
    <>
      <SectionHeader
        title={<TranslatedText labelKey="sections.phases" />}
        action={
          <AddActionButton onClick={() => setIsCreating(true)}>
            <TranslatedText labelKey="actions.newPhase" />
          </AddActionButton>
        }
      />

      <form id="create-phase-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.name" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.description" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.sort" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.active" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.workstreams" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.actions" /></th>
          </tr>
        </thead>

        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>
                <input
                  name="name"
                  required
                  placeholder="New phase"
                  style={inputStyle}
                  form="create-phase-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="description"
                  placeholder="Description"
                  style={inputStyle}
                  form="create-phase-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={100}
                  style={inputStyle}
                  form="create-phase-form"
                />
              </td>

              <td style={tdStyle}><TranslatedText labelKey="labels.new" /></td>
              <td style={tdStyle}>0</td>

              <td style={tdStyle}>
                <button type="submit" form="create-phase-form" style={tableButtonStyle}>
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

          {phases.map((phase) => (
            <PhaseRow
              key={phase.id}
              phase={phase}
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

function PhaseRow({
  phase,
  handleUpdate,
  handleToggle,
  handleDelete,
}: {
  phase: PhaseAdminRow;
  handleUpdate: ClientActionHandler;
  handleToggle: ClientActionHandler;
  handleDelete: ClientActionHandler;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: phase.name ?? "",
    description: phase.description ?? "",
    sortOrder: phase.sortOrder ?? 100,
  });

  function resetDraft() {
    setDraft({
      name: phase.name ?? "",
      description: phase.description ?? "",
      sortOrder: phase.sortOrder ?? 100,
    });
  }

  return (
    <tr>
      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            style={inputStyle}
          />
        ) : (
          phase.name
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            style={inputStyle}
          />
        ) : (
          phase.description || "-"
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
          phase.sortOrder
        )}
      </td>

      <td style={tdStyle}>{phase.isActive ? "Active" : "Inactive"}</td>
      <td style={tdStyle}>{phase.workstreamCount}</td>

      <td style={tdStyle}>
        {isEditing ? (
          <>
            <form action={handleUpdate} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={phase.id} />
              <input type="hidden" name="name" value={draft.name} />
              <input type="hidden" name="description" value={draft.description} />
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
            <button type="button" style={tableButtonStyle} onClick={() => setIsEditing(true)}>
              <TranslatedButtonLabel labelKey="actions.edit" />
            </button>{" "}
            <form action={handleToggle} style={{ margin: 0, display: "inline" }}>
              <input type="hidden" name="id" value={phase.id} />
              <input type="hidden" name="current" value={String(phase.isActive)} />
              <button type="submit" style={tableButtonStyle}>
                {<TranslatedButtonLabel labelKey={phase.isActive ? "actions.deactivate" : "actions.activate"} />}
              </button>
            </form>{" "}
            <form action={handleDelete} style={{ margin: 0, display: "inline" }}>
              <input type="hidden" name="id" value={phase.id} />
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
