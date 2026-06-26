"use client";

import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import type {
  WorkstreamActionResult,
  WorkstreamAdminRow,
  WorkstreamPhaseOption,
} from "@/lib/domain/workstreams/workstreamTypes";

type ActionHandler = (
  formData: FormData
) => Promise<WorkstreamActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

export function WorkstreamsTable({
  workstreams,
  phases,
  createWorkstream,
  updateWorkstream,
  toggleWorkstream,
  deleteWorkstream,
}: {
  workstreams: WorkstreamAdminRow[];
  phases: WorkstreamPhaseOption[];
  createWorkstream: ActionHandler;
  updateWorkstream: ActionHandler;
  toggleWorkstream: ActionHandler;
  deleteWorkstream: ActionHandler;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(createWorkstream, formData, () => setIsCreating(false));
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updateWorkstream, formData);
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleWorkstream, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteWorkstream, formData);
  }

  return (
    <>
      <SectionHeader
        title={<TranslatedText labelKey="labels.workstreams" />}
        action={
          <AddActionButton onClick={() => setIsCreating(true)}>
            <TranslatedText labelKey="actions.newWorkstream" />
          </AddActionButton>
        }
      />

      <form id="create-workstream-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.name" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.description" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.phase" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.sort" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.active" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.projects" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.templates" /></th>
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
                  placeholder="New workstream"
                  style={inputStyle}
                  form="create-workstream-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="description"
                  placeholder="Description"
                  style={inputStyle}
                  form="create-workstream-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <select
                  name="phaseId"
                  required
                  style={inputStyle}
                  form="create-workstream-form"
                >
                  <option value=""><TranslatedText labelKey="timeTracking.selectPhase" /></option>
                  {phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.name}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={100}
                  style={inputStyle}
                  form="create-workstream-form"
                />
              </td>

              <td style={tdStyle}><TranslatedText labelKey="labels.new" /></td>
              <td style={tdStyle}>0</td>
              <td style={tdStyle}>0</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-workstream-form"
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

          {workstreams.map((workstream) => (
            <WorkstreamRow
              key={workstream.id}
              workstream={workstream}
              phases={phases}
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

function WorkstreamRow({
  workstream,
  phases,
  handleUpdate,
  handleToggle,
  handleDelete,
}: {
  workstream: WorkstreamAdminRow;
  phases: WorkstreamPhaseOption[];
  handleUpdate: ClientActionHandler;
  handleToggle: ClientActionHandler;
  handleDelete: ClientActionHandler;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: workstream.name ?? "",
    description: workstream.description ?? "",
    phaseId: workstream.phaseId ?? "",
    sortOrder: workstream.sortOrder ?? 100,
  });

  function resetDraft() {
    setDraft({
      name: workstream.name ?? "",
      description: workstream.description ?? "",
      phaseId: workstream.phaseId ?? "",
      sortOrder: workstream.sortOrder ?? 100,
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
          workstream.name
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
          workstream.description || "-"
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <select
            value={draft.phaseId}
            onChange={(e) => setDraft({ ...draft, phaseId: e.target.value })}
            style={inputStyle}
          >
            <option value="">Select phase</option>
            {phases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>
        ) : (
          workstream.phase?.name || "-"
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
          workstream.sortOrder
        )}
      </td>

      <td style={tdStyle}>{workstream.isActive ? "Active" : "Inactive"}</td>
      <td style={tdStyle}>{workstream.projectWorkstreamCount}</td>
      <td style={tdStyle}>{workstream.templateWorkstreamCount}</td>

      <td style={tdStyle}>
        {isEditing ? (
          <>
            <form action={handleUpdate} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={workstream.id} />
              <input type="hidden" name="name" value={draft.name} />
              <input type="hidden" name="description" value={draft.description} />
              <input type="hidden" name="phaseId" value={draft.phaseId} />
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
              <input type="hidden" name="id" value={workstream.id} />
              <input
                type="hidden"
                name="current"
                value={String(workstream.isActive)}
              />
              <button type="submit" style={tableButtonStyle}>
                {<TranslatedButtonLabel labelKey={workstream.isActive ? "actions.deactivate" : "actions.activate"} />}
              </button>
            </form>{" "}
            <form action={handleDelete} style={{ margin: 0, display: "inline" }}>
              <input type="hidden" name="id" value={workstream.id} />
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
