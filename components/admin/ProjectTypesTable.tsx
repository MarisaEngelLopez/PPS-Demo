"use client";

import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  buttonStyle,
  inputStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";

export function ProjectTypesTable({
  projectTypes,
  createProjectType,
  toggleProjectType,
  deleteProjectType,
}: any) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  
  async function handleCreate(formData: FormData) {
    await handleAction(createProjectType, formData, () =>
      setIsCreating(false)
    );
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleProjectType, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteProjectType, formData);
  }

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <button style={buttonStyle} onClick={() => setIsCreating(true)}>
          ➕ New Project Type
        </button>
      </div>

      <form id="create-project-type-form" action={handleCreate} />

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
                  form="create-project-type-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="name"
                  required
                  placeholder="Name"
                  style={inputStyle}
                  form="create-project-type-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="description"
                  placeholder="Description"
                  style={inputStyle}
                  form="create-project-type-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={0}
                  style={inputStyle}
                  form="create-project-type-form"
                />
              </td>

              <td style={tdStyle}>New</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-project-type-form"
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

          {projectTypes.map((projectType: any) => (
            <tr key={projectType.id}>
              <td style={tdStyle}>{projectType.code}</td>
              <td style={tdStyle}>{projectType.name}</td>
              <td style={tdStyle}>{projectType.description || "-"}</td>
              <td style={tdStyle}>{projectType.sortOrder}</td>
              <td style={tdStyle}>
                {projectType.isActive ? "Active" : "Inactive"}
              </td>

              <td style={tdStyle}>
                <form
                  action={handleToggle}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={projectType.id} />
                  <input
                    type="hidden"
                    name="current"
                    value={String(projectType.isActive)}
                  />
                  <button type="submit" style={tableButtonStyle}>
                    {projectType.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>{" "}

                <form
                  action={handleDelete}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={projectType.id} />
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