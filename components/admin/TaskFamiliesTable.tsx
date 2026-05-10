"use client";

import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  buttonStyle,
  inputStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";

export function TaskFamiliesTable({
  taskFamilies,
  createTaskFamily,
  toggleTaskFamily,
  deleteTaskFamily,
}: any) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

    async function handleCreate(formData: FormData) {
    await handleAction(createTaskFamily, formData, () => setIsCreating(false));
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleTaskFamily, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteTaskFamily, formData);
  }

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <button style={buttonStyle} onClick={() => setIsCreating(true)}>
          ➕ New Task Family
        </button>
      </div>

      <form id="create-task-family-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Code</th>
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
                  name="code"
                  required
                  placeholder="CODE"
                  style={inputStyle}
                  form="create-task-family-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="name"
                  required
                  placeholder="Name"
                  style={inputStyle}
                  form="create-task-family-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="description"
                  placeholder="Description"
                  style={inputStyle}
                  form="create-task-family-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={0}
                  style={inputStyle}
                  form="create-task-family-form"
                />
              </td>

              <td style={tdStyle}>New</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-task-family-form"
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

          {taskFamilies.map((taskFamily: any) => (
            <tr key={taskFamily.id}>
              <td style={tdStyle}>{taskFamily.code}</td>
              <td style={tdStyle}>{taskFamily.name}</td>
              <td style={tdStyle}>{taskFamily.description || "-"}</td>
              <td style={tdStyle}>{taskFamily.sortOrder}</td>
              <td style={tdStyle}>
                {taskFamily.isActive ? "Active" : "Inactive"}
              </td>

              <td style={tdStyle}>
                <form
                  action={handleToggle}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={taskFamily.id} />
                  <input
                    type="hidden"
                    name="current"
                    value={String(taskFamily.isActive)}
                  />
                  <button type="submit" style={tableButtonStyle}>
                    {taskFamily.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>{" "}

                <form
                  action={handleDelete}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={taskFamily.id} />
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