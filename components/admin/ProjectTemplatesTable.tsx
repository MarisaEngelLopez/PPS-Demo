// components/admin/ProjectTemplatesTable.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  buttonStyle,
  inputStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";

type Props = {
  templates: any[];
  createProjectTemplate: (formData: FormData) => Promise<any>;
  toggleProjectTemplate: (formData: FormData) => Promise<any>;
  deleteProjectTemplate: (formData: FormData) => Promise<any>;
};

export function ProjectTemplatesTable({
  templates,
  createProjectTemplate,
  toggleProjectTemplate,
  deleteProjectTemplate,
}: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  
  async function handleCreate(formData: FormData) {
    await handleAction(createProjectTemplate, formData, () =>
      setIsCreating(false)
    );
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleProjectTemplate, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteProjectTemplate, formData);
  }

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <button style={buttonStyle} onClick={() => setIsCreating(true)}>
          ➕ New Template
        </button>
      </div>

      <form id="create-template-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Code</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Workstreams</th>
            <th style={thStyle}>Active</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>
                <input
                  name="code"
                  required
                  placeholder="IT_IMPL"
                  style={inputStyle}
                  form="create-template-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="name"
                  required
                  placeholder="Standard IT Implementation"
                  style={inputStyle}
                  form="create-template-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>0</td>
              <td style={tdStyle}>Yes</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-template-form"
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

          {templates.map((template) => (
            <tr key={template.id}>
              <td style={tdStyle}>{template.code}</td>

              <td style={tdStyle}>
                <Link
                  href={`/admin/project-templates/${template.id}`}
                  style={{
                    color: "#2563eb",
                    textDecoration: "underline",
                    fontWeight: 600,
                  }}
                >
                  {template.name}
                </Link>
              </td>

              <td style={tdStyle}>
                {template.templateWorkstreams?.length ?? 0}
              </td>

              <td style={tdStyle}>{template.isActive ? "Yes" : "No"}</td>

              <td style={tdStyle}>
                <form
                  action={handleToggle}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={template.id} />
                  <input
                    type="hidden"
                    name="current"
                    value={String(template.isActive)}
                  />

                  <button type="submit" style={tableButtonStyle}>
                    {template.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>{" "}

                <form
                  action={handleDelete}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={template.id} />

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