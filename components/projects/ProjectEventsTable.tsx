"use client";

import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  buttonStyle,
  inputStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";

function toDateInputValue(value: any) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function ProjectEventsTable({
  projectId,
  events,
  eventTypes,
  createProjectEvent,
  toggleProjectEvent,
  deleteProjectEvent,
}: any) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(createProjectEvent, formData, () =>
      setIsCreating(false)
    );
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleProjectEvent, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteProjectEvent, formData);
  }

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => setIsCreating(true)}
        >
          ➕ Add Milestone
        </button>
      </div>

      <form id="create-project-event-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Event Type</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>
                <input
                  type="hidden"
                  name="projectId"
                  value={projectId}
                  form="create-project-event-form"
                />

                <select
                  name="eventTypeId"
                  required
                  style={inputStyle}
                  form="create-project-event-form"
                >
                  <option value="">Select event type</option>
                  {(eventTypes ?? []).map((eventType: any) => (
                    <option key={eventType.id} value={eventType.id}>
                      {eventType.name}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <input
                  type="date"
                  name="eventDate"
                  required
                  style={inputStyle}
                  form="create-project-event-form"
                />
              </td>

              <td style={tdStyle}>New</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-project-event-form"
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

          {(events ?? []).map((event: any) => (
            <tr
              key={event.id}
              style={{
                opacity: event.isActive ? 1 : 0.4,
                backgroundColor: event.isActive ? "transparent" : "#f8fafc",
              }}
            >
              <td style={tdStyle}>
                {event.eventType?.name ?? event.name ?? "-"}
              </td>
              <td style={tdStyle}>{toDateInputValue(event.eventDate)}</td>
              <td style={tdStyle}>{event.isActive ? "Active" : "Inactive"}</td>

              <td style={tdStyle}>
                <form
                  action={handleToggle}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={event.id} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <input
                    type="hidden"
                    name="current"
                    value={String(event.isActive)}
                  />
                  <button type="submit" style={tableButtonStyle}>
                    {event.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>{" "}

                <form
                  action={handleDelete}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={event.id} />
                  <input type="hidden" name="projectId" value={projectId} />
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