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

type Project = {
  id: string;
  projectCode: string;
  name: string;
  startDate?: string | Date | null;
  healthStatus: string;
  projectType?: { name: string } | null;
  status?: { name: string } | null;
  projectManager?: { fullName: string } | null;
};

type Option = {
  id: string;
  name: string;
};

type UserOption = {
  id: string;
  fullName: string;
};

type Props = {
  projects: Project[];
  projectTypes: Option[];
  statuses: Option[];
  users: UserOption[];
  templates: Option[];
  createProject: (formData: FormData) => Promise<any>;
  deleteProject: (formData: FormData) => Promise<any>;
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  return new Date(value).toISOString().slice(0, 10);
}

export function ProjectsTable({
  projects,
  projectTypes,
  statuses,
  users,
  templates,
  createProject,
  deleteProject,
}: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(createProject, formData, () => setIsCreating(false));
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteProject, formData);
  }

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <button style={buttonStyle} onClick={() => setIsCreating(true)}>
          ➕ New Project
        </button>
      </div>

      <form id="create-project-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Code</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Template</th>
            <th style={thStyle}>Start Date</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Project Manager</th>
            <th style={thStyle}>Health</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>
                <input
                  name="projectCode"
                  required
                  placeholder="PRJ-002"
                  style={inputStyle}
                  form="create-project-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="name"
                  required
                  placeholder="Project name"
                  style={inputStyle}
                  form="create-project-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <select
                  name="projectTypeId"
                  required
                  style={inputStyle}
                  form="create-project-form"
                >
                  <option value="">Select type</option>
                  {projectTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <select
                  name="templateId"
                  style={inputStyle}
                  form="create-project-form"
                >
                  <option value="">No template</option>
                  {(templates ?? []).map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  style={inputStyle}
                  form="create-project-form"
                />
              </td>

              <td style={tdStyle}>
                <select
                  name="statusId"
                  required
                  style={inputStyle}
                  form="create-project-form"
                >
                  <option value="">Select status</option>
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <select
                  name="projectManagerId"
                  required
                  style={inputStyle}
                  form="create-project-form"
                >
                  <option value="">Select manager</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>GREEN</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-project-form"
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

          {projects.map((project) => (
            <tr key={project.id}>
              <td style={tdStyle}>{project.projectCode}</td>

              <td style={tdStyle}>
                <Link
                  href={`/projects/${project.id}`}
                  style={{
                    color: "#2563eb",
                    textDecoration: "underline",
                    fontWeight: 600,
                  }}
                >
                  {project.name}
                </Link>
              </td>

              <td style={tdStyle}>{project.projectType?.name ?? "-"}</td>
              <td style={tdStyle}>-</td>
              <td style={tdStyle}>{formatDate(project.startDate)}</td>
              <td style={tdStyle}>{project.status?.name ?? "-"}</td>
              <td style={tdStyle}>
                {project.projectManager?.fullName ?? "-"}
              </td>
              <td style={tdStyle}>{project.healthStatus}</td>

              <td style={tdStyle}>
                <form
                  action={handleDelete}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={project.id} />
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