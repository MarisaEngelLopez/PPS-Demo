"use client";

import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  buttonStyle,
  inputStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";

export function ProjectWorkstreamsTable({
  availableWorkstreams = [],
  projectWorkstreams = [],
  createProjectWorkstream,
  toggleProjectWorkstream,
  deleteProjectWorkstream,
  updateProjectWorkstreamDates,
}: any) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(createProjectWorkstream, formData, () =>
      setIsCreating(false)
    );
  }

  async function handleUpdateDates(formData: FormData) {
    await handleAction(updateProjectWorkstreamDates, formData);
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleProjectWorkstream, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteProjectWorkstream, formData);
  }

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <button style={buttonStyle} onClick={() => setIsCreating(true)}>
          ➕ Add Workstream to Project
        </button>
      </div>

      <form id="create-workstream-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Workstream</th>
            <th style={thStyle}>Phase</th>
            <th style={thStyle}>Planned Start</th>
            <th style={thStyle}>Planned End</th>
            <th style={thStyle}>Actual Start</th>
            <th style={thStyle}>Actual End</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>
                <select
                  name="workstreamId"
                  required
                  style={inputStyle}
                  form="create-workstream-form"
                >
                  <option value="">Select workstream</option>
                  {(availableWorkstreams ?? []).map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.phase?.name ? `${w.phase.name} - ${w.name}` : w.name}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>—</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>—</td>
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

          {(projectWorkstreams ?? []).map((pw: any) => (
            <ProjectWorkstreamRow
              key={pw.id}
              pw={pw}
              updateProjectWorkstreamDates={handleUpdateDates}
              toggleProjectWorkstream={handleToggle}
              deleteProjectWorkstream={handleDelete}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}

function toDateInputValue(value: any) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function ProjectWorkstreamRow({
  pw,
  updateProjectWorkstreamDates,
  toggleProjectWorkstream,
  deleteProjectWorkstream,
}: any) {
  const [plannedStartDate, setPlannedStartDate] = useState(
    toDateInputValue(pw.plannedStartDate)
  );
  const [plannedEndDate, setPlannedEndDate] = useState(
    toDateInputValue(pw.plannedEndDate)
  );
  const [actualStartDate, setActualStartDate] = useState(
    toDateInputValue(pw.actualStartDate)
  );
  const [actualEndDate, setActualEndDate] = useState(
    toDateInputValue(pw.actualEndDate)
  );

  return (
   <tr
  style={{
    opacity: pw.isActive ? 1 : 0.4,
    backgroundColor: pw.isActive ? "transparent" : "#f8fafc",
  }}
>
      <td style={tdStyle}>{pw.workstream?.name ?? "-"}</td>
      <td style={tdStyle}>{pw.workstream?.phase?.name ?? "-"}</td>

      <td style={tdStyle}>
        <input
          type="date"
          value={plannedStartDate}
          onChange={(e) => setPlannedStartDate(e.target.value)}
          style={inputStyle}
        />
      </td>

      <td style={tdStyle}>
        <input
          type="date"
          value={plannedEndDate}
          onChange={(e) => setPlannedEndDate(e.target.value)}
          style={inputStyle}
        />
      </td>

      <td style={tdStyle}>
        <input
          type="date"
          value={actualStartDate}
          onChange={(e) => setActualStartDate(e.target.value)}
          style={inputStyle}
        />
      </td>

      <td style={tdStyle}>
        <input
          type="date"
          value={actualEndDate}
          onChange={(e) => setActualEndDate(e.target.value)}
          style={inputStyle}
        />
      </td>

      <td style={tdStyle}>{pw.isActive ? "Active" : "Inactive"}</td>

      <td style={tdStyle}>
        <form
          action={updateProjectWorkstreamDates}
          style={{ margin: 0, display: "inline" }}
        >
          <input type="hidden" name="id" value={pw.id} />
          <input
            type="hidden"
            name="plannedStartDate"
            value={plannedStartDate}
          />
          <input type="hidden" name="plannedEndDate" value={plannedEndDate} />
          <input type="hidden" name="actualStartDate" value={actualStartDate} />
          <input type="hidden" name="actualEndDate" value={actualEndDate} />

          <button type="submit" style={tableButtonStyle}>
            Save Dates
          </button>
        </form>{" "}

        <form
          action={toggleProjectWorkstream}
          style={{ margin: 0, display: "inline" }}
        >
          <input type="hidden" name="id" value={pw.id} />
          <input type="hidden" name="current" value={String(pw.isActive)} />

          <button type="submit" style={tableButtonStyle}>
            {pw.isActive ? "Deactivate" : "Activate"}
          </button>
        </form>{" "}

        <form
          action={deleteProjectWorkstream}
          style={{ margin: 0, display: "inline" }}
        >
          <input type="hidden" name="id" value={pw.id} />

          <button type="submit" style={tableButtonStyle}>
            Delete
          </button>
        </form>
      </td>
    </tr>
  );
}