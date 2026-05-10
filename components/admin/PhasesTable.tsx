"use client";

import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  buttonStyle,
  inputStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";

export function PhasesTable({
  phases,
  createPhase,
  togglePhase,
  deletePhase,
}: any) {
  const [isCreating, setIsCreating] = useState(false);
 const { handleAction } = useActionToast();

    async function handleCreate(formData: FormData) {
    await handleAction(createPhase, formData, () => setIsCreating(false));
  }

  async function handleToggle(formData: FormData) {
    await handleAction(togglePhase, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deletePhase, formData);
  }

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <button style={buttonStyle} onClick={() => setIsCreating(true)}>
          ➕ New Phase
        </button>
      </div>

      <form id="create-phase-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Description</th>
            <th style={thStyle}>Sort</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Action</th>
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
                  defaultValue={0}
                  style={inputStyle}
                  form="create-phase-form"
                />
              </td>

              <td style={tdStyle}>New</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-phase-form"
                  style={tableButtonStyle}
                >
                  Save
                </button>{" "}
                <button
                  type="button"
                  style={tableButtonStyle}
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
              </td>
            </tr>
          )}

          {phases.map((phase: any) => (
            <tr key={phase.id}>
              <td style={tdStyle}>{phase.name}</td>
              <td style={tdStyle}>{phase.description || "-"}</td>
              <td style={tdStyle}>{phase.sortOrder}</td>
              <td style={tdStyle}>{phase.isActive ? "Active" : "Inactive"}</td>

              <td style={tdStyle}>
                <form
                  action={handleToggle}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={phase.id} />
                  <input
                    type="hidden"
                    name="current"
                    value={String(phase.isActive)}
                  />
                  <button type="submit" style={tableButtonStyle}>
                    {phase.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>{" "}

                <form
                  action={handleDelete}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={phase.id} />
                  <button type="submit" style={tableButtonStyle}>
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}