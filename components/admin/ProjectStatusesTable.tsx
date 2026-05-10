"use client";

import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  buttonStyle,
  inputStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";

export function ProjectStatusesTable({
  statuses,
  createStatus,
  toggleActive,
  deleteStatus,
}: any) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

    async function handleCreate(formData: FormData) {
    await handleAction(createStatus, formData, () => setIsCreating(false));
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleActive, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteStatus, formData);
  }

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <button style={buttonStyle} onClick={() => setIsCreating(true)}>
          ➕ New Status
        </button>
      </div>

      <form id="create-status-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Code</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Name (ES)</th>
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
              </td>

              <td style={tdStyle}>
                <input
                  name="nameEs"
                  placeholder="Nombre"
                  style={inputStyle}
                  form="create-status-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={0}
                  style={inputStyle}
                  form="create-status-form"
                />
              </td>

              <td style={tdStyle}>New</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-status-form"
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

          {statuses.map((status: any) => (
            <tr key={status.id}>
              <td style={tdStyle}>{status.code}</td>
              <td style={tdStyle}>{status.name}</td>
              <td style={tdStyle}>{status.nameEs || "-"}</td>
              <td style={tdStyle}>{status.sortOrder}</td>
              <td style={tdStyle}>
                {status.isActive ? "Active" : "Inactive"}
              </td>

              <td style={tdStyle}>
                <form
                  action={handleToggle}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={status.id} />
                  <input
                    type="hidden"
                    name="current"
                    value={String(status.isActive)}
                  />
                  <button type="submit" style={tableButtonStyle}>
                    {status.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>{" "}

                <form
                  action={handleDelete}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={status.id} />
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