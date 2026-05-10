"use client";

import { useActionToast } from "@/components/ui/useActionToast";
import {
  buttonStyle,
  detailGridStyle,
  labelStyle,
  compactInputStyle,
} from "@/components/ui/layoutStyles";

export function ProjectHeaderForm({
  project,
  users,
  statuses,
  updateProject,
}: any) {
  const { handleAction } = useActionToast();

  async function handleSubmit(formData: FormData) {
    await handleAction(updateProject, formData);
  }

  const startDateValue = project.startDate?.toISOString().slice(0, 10) ?? "";
  const plannedStartDateValue =
    project.plannedStartDate?.toISOString().slice(0, 10) ?? "";
  const plannedEndDateValue =
    project.plannedEndDate?.toISOString().slice(0, 10) ?? "";
  const actualStartDateValue =
    project.actualStartDate?.toISOString().slice(0, 10) ?? "";
  const actualEndDateValue =
    project.actualEndDate?.toISOString().slice(0, 10) ?? "";

  return (
    <form action={handleSubmit} style={detailGridStyle}>
      <input type="hidden" name="id" value={project.id} />

      <div style={labelStyle}>Project Name</div>
      <input
        name="name"
        required
        defaultValue={project.name}
        style={compactInputStyle}
        autoComplete="off"
      />

      <div style={labelStyle}>Sponsor</div>
      <select
        name="sponsorId"
        defaultValue={project.sponsorId || ""}
        style={compactInputStyle}
      >
        <option value="">No sponsor</option>
        {users.map((user: any) => (
          <option key={user.id} value={user.id}>
            {user.fullName}
          </option>
        ))}
      </select>

      <div style={labelStyle}>Status</div>
      <select
        name="statusId"
        defaultValue={project.statusId}
        style={compactInputStyle}
      >
        {statuses.map((status: any) => (
          <option key={status.id} value={status.id}>
            {status.name}
          </option>
        ))}
      </select>

      <div style={labelStyle}>Health</div>
      <select
        name="healthStatus"
        defaultValue={project.healthStatus}
        style={compactInputStyle}
      >
        <option value="GREEN">Green</option>
        <option value="AMBER">Amber</option>
        <option value="RED">Red</option>
      </select>

      <div style={labelStyle}>Reporting Cadence</div>
      <select
        name="reportingCadence"
        defaultValue={project.reportingCadence}
        style={compactInputStyle}
      >
        <option value="WEEKLY">Weekly</option>
        <option value="MONTHLY">Monthly</option>
      </select>

      <div style={labelStyle}>Start Date</div>
      <input
        type="date"
        name="startDate"
        defaultValue={startDateValue}
        style={compactInputStyle}
      />

      <div style={labelStyle}>Planned Start</div>
      <input
        type="date"
        name="plannedStartDate"
        defaultValue={plannedStartDateValue}
        style={compactInputStyle}
      />

      <div style={labelStyle}>Planned End</div>
      <input
        type="date"
        name="plannedEndDate"
        defaultValue={plannedEndDateValue}
        style={compactInputStyle}
      />

      <div style={labelStyle}>Actual Start</div>
      <input
        type="date"
        name="actualStartDate"
        defaultValue={actualStartDateValue}
        style={compactInputStyle}
      />

      <div style={labelStyle}>Actual End</div>
      <input
        type="date"
        name="actualEndDate"
        defaultValue={actualEndDateValue}
        style={compactInputStyle}
      />

      <div />
      <button type="submit" style={buttonStyle}>
        Save Project Changes
      </button>
    </form>
  );
}