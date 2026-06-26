"use client";

import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import type {
  EventTypeActionResult,
  EventTypeAdminRow,
} from "@/lib/domain/eventTypes/eventTypeTypes";

type ActionHandler = (
  formData: FormData
) => Promise<EventTypeActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

export function EventTypesTable({
  eventTypes,
  createEventType,
  updateEventType,
  toggleEventType,
  deleteEventType,
}: {
  eventTypes: EventTypeAdminRow[];
  createEventType: ActionHandler;
  updateEventType: ActionHandler;
  toggleEventType: ActionHandler;
  deleteEventType: ActionHandler;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(createEventType, formData, () => setIsCreating(false));
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updateEventType, formData);
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleEventType, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteEventType, formData);
  }

  return (
    <>
      <SectionHeader
        title={<TranslatedText labelKey="sections.eventTypes" />}
        action={
          <AddActionButton onClick={() => setIsCreating(true)}>
            <TranslatedText labelKey="actions.newEventType" />
          </AddActionButton>
        }
      />

      <form id="create-event-type-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.code" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.name" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.description" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.sort" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.active" /></th>
            <th style={thStyle}><TranslatedText labelKey="sections.milestones" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.actions" /></th>
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

              <td style={tdStyle}><TranslatedText labelKey="labels.new" /></td>
              <td style={tdStyle}>0</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-event-type-form"
                  style={tableButtonStyle}
                >
                  <TranslatedButtonLabel labelKey="actions.save" />
                </button>{" "}
                <button
                  type="button"
                  style={tableButtonStyle}
                  onClick={() => setIsCreating(false)}
                >
                  <TranslatedButtonLabel labelKey="actions.cancel" />
                </button>
              </td>
            </tr>
          )}

          {eventTypes.map((eventType) => (
            <EventTypeRow
              key={eventType.id}
              eventType={eventType}
              handleUpdate={handleUpdate}
              handleToggle={handleToggle}
              handleDelete={handleDelete}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}

function EventTypeRow({
  eventType,
  handleUpdate,
  handleToggle,
  handleDelete,
}: {
  eventType: EventTypeAdminRow;
  handleUpdate: ClientActionHandler;
  handleToggle: ClientActionHandler;
  handleDelete: ClientActionHandler;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    code: eventType.code ?? "",
    name: eventType.name ?? "",
    description: eventType.description ?? "",
    sortOrder: eventType.sortOrder ?? 100,
  });

  function resetDraft() {
    setDraft({
      code: eventType.code ?? "",
      name: eventType.name ?? "",
      description: eventType.description ?? "",
      sortOrder: eventType.sortOrder ?? 100,
    });
  }

  return (
    <tr>
      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={draft.code}
            onChange={(e) =>
              setDraft({ ...draft, code: e.target.value.toUpperCase() })
            }
            style={inputStyle}
          />
        ) : (
          eventType.code
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            style={inputStyle}
          />
        ) : (
          eventType.name
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
            style={inputStyle}
          />
        ) : (
          eventType.description || "-"
        )}
      </td>

      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="number"
            value={draft.sortOrder}
            onChange={(e) =>
              setDraft({ ...draft, sortOrder: Number(e.target.value || 100) })
            }
            style={{ ...inputStyle, width: 80 }}
          />
        ) : (
          eventType.sortOrder
        )}
      </td>

      <td style={tdStyle}>{eventType.isActive ? "Active" : "Inactive"}</td>
      <td style={tdStyle}>{eventType.milestoneCount}</td>

      <td style={tdStyle}>
        {isEditing ? (
          <>
            <form action={handleUpdate} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={eventType.id} />
              <input type="hidden" name="code" value={draft.code} />
              <input type="hidden" name="name" value={draft.name} />
              <input type="hidden" name="description" value={draft.description} />
              <input type="hidden" name="sortOrder" value={draft.sortOrder} />
              <button type="submit" style={tableButtonStyle}>
                <TranslatedButtonLabel labelKey="actions.save" />
              </button>
            </form>{" "}
            <button
              type="button"
              style={tableButtonStyle}
              onClick={() => {
                resetDraft();
                setIsEditing(false);
              }}
            >
              <TranslatedButtonLabel labelKey="actions.cancel" />
            </button>
          </>
        ) : (
          <>
            <button type="button" style={tableButtonStyle} onClick={() => setIsEditing(true)}>
              <TranslatedButtonLabel labelKey="actions.edit" />
            </button>{" "}
            <form action={handleToggle} style={{ margin: 0, display: "inline" }}>
              <input type="hidden" name="id" value={eventType.id} />
              <input
                type="hidden"
                name="current"
                value={String(eventType.isActive)}
              />
              <button type="submit" style={tableButtonStyle}>
                {<TranslatedButtonLabel labelKey={eventType.isActive ? "actions.deactivate" : "actions.activate"} />}
              </button>
            </form>{" "}
            <form action={handleDelete} style={{ margin: 0, display: "inline" }}>
              <input type="hidden" name="id" value={eventType.id} />
              <button type="submit" style={tableButtonStyle}>
                <TranslatedButtonLabel labelKey="actions.delete" />
              </button>
            </form>
          </>
        )}
      </td>
    </tr>
  );
}
