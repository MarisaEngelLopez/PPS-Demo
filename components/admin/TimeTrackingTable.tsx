"use client";


import { useState, useEffect } from "react";
import {
  buttonStyle,
  inputStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";

export function TimeTrackingTable({
  projects,
  projectWorkstreams,
  timeEntries,
  defaultProjectId,
  createTimeEntry,
  deleteTimeEntry,
}: any) {

const [isCreating, setIsCreating] = useState(false);
const [formVersion, setFormVersion] = useState(0);

const [selectedProject, setSelectedProject] = useState(defaultProjectId);

function getFastEntryProjectId() {
  if (typeof window === "undefined") return defaultProjectId;

  return (
    localStorage.getItem("lastTimeEntryProjectId") ||
    selectedProject ||
    defaultProjectId
  );
}

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
       <button
  style={buttonStyle}
  onClick={() => {
    setSelectedProject(getFastEntryProjectId());
    setIsCreating(true);
  }}
>
  ➕ New Time Entry
</button>
      </div>

     <form
  key={formVersion}
  id="create-time-entry-form"
  action={async (formData) => {
    const projectId = String(formData.get("projectId") || "");

    if (projectId) {
      localStorage.setItem("lastTimeEntryProjectId", projectId);
      setSelectedProject(projectId);
    }

    await createTimeEntry(formData);

    setSelectedProject(projectId);
    setFormVersion((v) => v + 1);
    setIsCreating(true);
  }}
/>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Project</th>
            <th style={thStyle}>Workstream</th>
            <th style={thStyle}>Hours</th>
            <th style={thStyle}>Description</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>
                <input
  name="date"
  type="date"
  required
  defaultValue={new Date().toISOString().slice(0, 10)}
  style={inputStyle}
  form="create-time-entry-form"
/>
              </td>

              <td style={tdStyle}>
               <select
  name="projectId"
  required
  value={selectedProject}
  onChange={(e) => {
    setSelectedProject(e.target.value);
    localStorage.setItem("lastTimeEntryProjectId", e.target.value);
  }}
  style={inputStyle}
  form="create-time-entry-form"
>
  {projects.map((project: any) => (
    <option key={project.id} value={project.id}>
      {project.projectCode} - {project.name}
    </option>
  ))}
</select>
              </td>

              <td style={tdStyle}>
                <select
                  name="projectWorkstreamId"
                  style={inputStyle}
                  form="create-time-entry-form"
                >
                  <option value="">No workstream</option>
                  {projectWorkstreams
  .filter((pw: any) => pw.projectId === selectedProject)
  .map((pw: any) => (
    <option key={pw.id} value={pw.id}>
      {pw.workstream.phase.name} / {pw.workstream.name}
    </option>
  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <input
                  name="hours"
                  type="number"
                  step="0.25"
                  min="0"
                  required
                  placeholder="0"
                  style={inputStyle}
                  form="create-time-entry-form"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="description"
                  placeholder="Description"
                  style={inputStyle}
                  form="create-time-entry-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-time-entry-form"
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

          {timeEntries.map((entry: any) => (
            <tr key={entry.id}>
              <td style={tdStyle}>
                {entry.date ? entry.date.toISOString().slice(0, 10) : "-"}
              </td>
              <td style={tdStyle}>
                {entry.project.projectCode} - {entry.project.name}
              </td>
              <td style={tdStyle}>
                {entry.projectWorkstream
                  ? `${entry.projectWorkstream.workstream.phase.name} / ${entry.projectWorkstream.workstream.name}`
                  : "-"}
              </td>
              <td style={tdStyle}>{entry.hours}</td>
              <td style={tdStyle}>{entry.description || "-"}</td>
              <td style={tdStyle}>
                <form
                  action={deleteTimeEntry}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={entry.id} />
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