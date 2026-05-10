"use client";

import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  buttonStyle,
  inputStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";

export function WorkstreamsTable({
  workstreams,
  phases,
  createWorkstream,
  toggleWorkstream,
  deleteWorkstream,
}: any) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

    async function handleCreate(formData: FormData) {
    await handleAction(createWorkstream, formData, () => setIsCreating(false));
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleWorkstream, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteWorkstream, formData);
  }

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <button style={buttonStyle} onClick={() => setIsCreating(true)}>
          ➕ New Workstream
        </button>
      </div>

      <form id="create-workstream-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Phase</th>
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
                  placeholder="New workstream"
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
                  <option value="">Select phase</option>
                  {phases.map((phase: any) => (
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
                  defaultValue={0}
                  style={inputStyle}
                  form="create-workstream-form"
                />
              </td>

              <td style={tdStyle}>New</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-workstream-form"
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

          {workstreams.map((workstream: any) => (
            <tr key={workstream.id}>
              <td style={tdStyle}>{workstream.name}</td>
              <td style={tdStyle}>{workstream.phase?.name || "-"}</td>
              <td style={tdStyle}>{workstream.sortOrder}</td>
              <td style={tdStyle}>
                {workstream.isActive ? "Active" : "Inactive"}
              </td>

              <td style={tdStyle}>
                <form
                  action={handleToggle}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={workstream.id} />
                  <input
                    type="hidden"
                    name="current"
                    value={String(workstream.isActive)}
                  />
                  <button type="submit" style={tableButtonStyle}>
                    {workstream.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>{" "}

                <form
                  action={handleDelete}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={workstream.id} />
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