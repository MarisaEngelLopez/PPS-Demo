"use client";

import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  buttonStyle,
  inputStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";

export function EventTypesTable({
  eventTypes,
  createEventType,
  toggleEventType,
  deleteEventType,
}: any) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(createEventType, formData, () => setIsCreating(false));
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleEventType, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteEventType, formData);
  }

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <button
  type="button"
  style={buttonStyle}
  onClick={() => setIsCreating(true)}
>
  ➕ New Event Type
</button>
      </div>

      <form id="create-event-type-form" action={handleCreate} />

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
                  placeholder="GO_LIVE"
                  style={inputStyle}
                  form="create-event-type-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="name"
                  required
                  placeholder="Go-live"
                  style={inputStyle}
                  form="create-event-type-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="description"
                  placeholder="Description"
                  style={inputStyle}
                  form="create-event-type-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={100}
                  style={inputStyle}
                  form="create-event-type-form"
                />
              </td>

              <td style={tdStyle}>New</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-event-type-form"
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

          {(eventTypes ?? []).map((eventType: any) => (
            <tr
              key={eventType.id}
              style={{
                opacity: eventType.isActive ? 1 : 0.4,
                backgroundColor: eventType.isActive ? "transparent" : "#f8fafc",
              }}
            >
              <td style={tdStyle}>{eventType.code}</td>
              <td style={tdStyle}>{eventType.name}</td>
              <td style={tdStyle}>{eventType.description || "-"}</td>
              <td style={tdStyle}>{eventType.sortOrder}</td>
              <td style={tdStyle}>{eventType.isActive ? "Active" : "Inactive"}</td>

              <td style={tdStyle}>
                <form
                  action={handleToggle}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={eventType.id} />
                  <input
                    type="hidden"
                    name="current"
                    value={String(eventType.isActive)}
                  />
                  <button type="submit" style={tableButtonStyle}>
                    {eventType.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>{" "}

                <form
                  action={handleDelete}
                  style={{ margin: 0, display: "inline" }}
                >
                  <input type="hidden" name="id" value={eventType.id} />
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