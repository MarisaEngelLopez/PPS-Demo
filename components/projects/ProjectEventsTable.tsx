"use client";

import {
  TranslatedButtonLabel,
  TranslatedText,
} from "@/components/ui/TranslatedControls";
import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  inputStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { StandardTable, TableActionGroup } from "@/components/ui/TablePrimitives";
import { thStyle, tdStyle } from "@/components/ui/tableStyles";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { NestedTablePanel } from "@/components/ui/NestedTablePanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import { getVisibilityOptions } from "@/lib/i18n/displayTranslations";

type ActionResult = { ok: boolean; message: string };
type ProjectEventAction = (formData: FormData) => Promise<ActionResult | undefined>;
type ClientProjectEventAction = (formData: FormData) => Promise<void>;

type EventTypeOption = {
  id: string;
  name: string;
};

type ProjectWorkstreamOption = {
  id: string;
  customName?: string | null;
  reportingName?: string | null;
  workstream?: {
    name?: string | null;
    phase?: { name?: string | null } | null;
  } | null;
};

type ProjectEventRowData = {
  id: string;
  name: string | null;
  customName: string | null;
  reportingName: string | null;
  description: string | null;
  visibility: string | null;
  linkedProjectWorkstreamId: string | null;
  eventDate: Date | string | null;
  completionDate: Date | string | null;
  isCompleted: boolean;
  isActive: boolean;
  plannedQuantity: number | null;
  actualQuantity: number | null;
  measureUnit: string | null;
  quantityType: string | null;
  eventType?: { name?: string | null } | null;
};

type ProjectEventsTableProps = {
  projectId: string;
  events: ProjectEventRowData[];
  eventTypes: EventTypeOption[];
  projectWorkstreams: ProjectWorkstreamOption[];
  createProjectEvent: ProjectEventAction;
  updateProjectEvent: ProjectEventAction;
  toggleProjectEvent: ProjectEventAction;
  deleteProjectEvent: ProjectEventAction;
};

type ProjectEventRowProps = {
  projectId: string;
  event: ProjectEventRowData;
  projectWorkstreams: ProjectWorkstreamOption[];
  visibilityOptions: { value: string; label: string }[];
  updateProjectEvent: ClientProjectEventAction;
  toggleProjectEvent: ClientProjectEventAction;
  deleteProjectEvent: ClientProjectEventAction;
};

function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function ProjectEventsTable({
  projectId,
  events,
  eventTypes,
  projectWorkstreams,
  createProjectEvent,
  updateProjectEvent,
  toggleProjectEvent,
  deleteProjectEvent,
}: ProjectEventsTableProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();
const [linkedProjectWorkstreamId, setLinkedProjectWorkstreamId] = useState("");
const { t } = useTranslation();
const visibilityOptions = getVisibilityOptions(t);

  async function handleCreate(formData: FormData) {
    await handleAction(createProjectEvent, formData, () =>
      setIsCreating(false)
    );
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updateProjectEvent, formData);
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleProjectEvent, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteProjectEvent, formData);
  }

  return (
    <>
<SectionHeader
  title={<TranslatedText labelKey="sections.milestones" />}

  action={
    <AddActionButton
    type="button"

    onClick={() => setIsCreating(true)}
    labelKey="actions.addMilestone"
  />
  }
/>

      <form id="create-project-event-form" action={handleCreate} />

      <StandardTable>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.eventType" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.customName" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.reportingName" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.visibility" /></th>
<th style={thStyle}><TranslatedText labelKey="labels.linkedWorkstream" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.eventDate" /></th>
            <th style={thStyle}><TranslatedText labelKey="metrics.completed" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.status" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.action" /></th>
          </tr>
        </thead>

        <tbody>
          {isCreating && (
            <>
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
                    {(eventTypes ?? []).map((eventType) => (
                      <option key={eventType.id} value={eventType.id}>
                        {eventType.name}
                      </option>
                    ))}
                  </select>
                </td>

                <td style={tdStyle}>
                  <input
                    name="customName"
                    placeholder="Custom name"
                    style={inputStyle}
                    form="create-project-event-form"
                  />
                </td>

                <td style={tdStyle}>
                  <input
                    name="reportingName"
                    placeholder="Reporting name"
                    style={inputStyle}
                    form="create-project-event-form"
                  />
                </td>

                <td style={tdStyle}>
                  <select
                    name="visibility"
                    defaultValue="BOTH"
                    style={inputStyle}
                    form="create-project-event-form"
                  >
                    {visibilityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>

<td style={tdStyle}>
  <select
  name="linkedProjectWorkstreamId"
  form="create-project-event-form"
  value={linkedProjectWorkstreamId}
  onChange={(e) => setLinkedProjectWorkstreamId(e.target.value)}
  style={inputStyle}
>
  <option value="">Project-level</option>

  {(projectWorkstreams ?? []).map((pw) => (
    <option key={pw.id} value={pw.id}>
      {pw.workstream?.phase?.name} -{" "}
      {pw.reportingName || pw.customName || pw.workstream?.name}
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

                <td style={tdStyle}>No</td>
                <td style={tdStyle}>New</td>

                <td style={tdStyle}>
                  <button
                    type="submit"
                    form="create-project-event-form"
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

              <tr>
                <td style={tdStyle} colSpan={9}>
                  <NestedTablePanel>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
                      gap: "0.75rem",
                    }}
                  >
                    <textarea
                      name="description"
                      placeholder="Description"
                      style={{ ...inputStyle, minHeight: "60px" }}
                      form="create-project-event-form"
                    />

                    <input
                      name="plannedQuantity"
                      type="number"
                      step="0.01"
                      placeholder="Planned qty"
                      style={inputStyle}
                      form="create-project-event-form"
                    />

                    <input
                      name="actualQuantity"
                      type="number"
                      step="0.01"
                      placeholder="Actual qty"
                      style={inputStyle}
                      form="create-project-event-form"
                    />

                    <input
                      name="measureUnit"
                      placeholder="Unit"
                      style={inputStyle}
                      form="create-project-event-form"
                    />

                    <select
                      name="quantityType"
                      defaultValue=""
                      style={inputStyle}
                      form="create-project-event-form"
                    >
                      <option value="">Type</option>
                      <option value="FIXED">Fixed</option>
                      <option value="VARIABLE">Variable</option>
                    </select>

                    <input
                      type="date"
                      name="completionDate"
                      style={inputStyle}
                      form="create-project-event-form"
                    />
                  </div>
                  </NestedTablePanel>
                </td>
              </tr>
            </>
          )}

          {(events ?? []).map((event) => (
            <ProjectEventRow
              key={event.id}
              projectId={projectId}
              event={event}
 projectWorkstreams={projectWorkstreams}
              visibilityOptions={visibilityOptions}
              updateProjectEvent={handleUpdate}
              toggleProjectEvent={handleToggle}
              deleteProjectEvent={handleDelete}
            />
          ))}
        </tbody>
      </StandardTable>
    </>
  );
}

function ProjectEventRow({
  projectId,
  event,
projectWorkstreams,
  visibilityOptions,
  updateProjectEvent,
  toggleProjectEvent,
  deleteProjectEvent,
}: ProjectEventRowProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [eventDate, setEventDate] = useState(toDateInputValue(event.eventDate));
  const [completionDate, setCompletionDate] = useState(
    toDateInputValue(event.completionDate)
  );
  const [isCompleted, setIsCompleted] = useState(Boolean(event.isCompleted));

const [customName, setCustomName] = useState(event.customName ?? "");
const [reportingName, setReportingName] = useState(event.reportingName ?? "");
const [visibility, setVisibility] = useState(event.visibility ?? "BOTH");
const [linkedProjectWorkstreamId, setLinkedProjectWorkstreamId] = useState(
  event.linkedProjectWorkstreamId ?? ""
);

  const formId = `event-form-${event.id}`;

  return (
    <>
      <tr
        id={`project-event-${event.id}`}
        style={{
          opacity: event.isActive ? 1 : 0.4,
          backgroundColor: event.isActive ? "transparent" : "#f8fafc",
        }}
      >
        <td style={tdStyle}>{event.eventType?.name ?? event.name ?? "-"}</td>

        <td style={tdStyle}>
          <input
  value={customName}
  onChange={(e) => setCustomName(e.target.value)}
  placeholder="Custom name"
  style={inputStyle}
/>
        </td>

        <td style={tdStyle}>
         <input
  value={reportingName}
  onChange={(e) => setReportingName(e.target.value)}
  placeholder="Reporting name"
  style={inputStyle}
/>
        </td>

        <td style={tdStyle}>
          <select
  value={visibility}
  onChange={(e) => setVisibility(e.target.value)}
  style={inputStyle}
>
  {visibilityOptions.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))}
</select>
        </td>

<td style={tdStyle}>
  <select
    value={linkedProjectWorkstreamId}
    onChange={(e) => setLinkedProjectWorkstreamId(e.target.value)}
    style={inputStyle}
  >
    <option value="">Project-level</option>

    {(projectWorkstreams ?? []).map((pw) => (
      <option key={pw.id} value={pw.id}>
        {pw.workstream?.phase?.name} -{" "}
        {pw.reportingName || pw.customName || pw.workstream?.name}
      </option>
    ))}
  </select>
</td>
        <td style={tdStyle}>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            style={inputStyle}
          />
        </td>

        <td style={tdStyle}>
          <select
            value={isCompleted ? "true" : "false"}
            onChange={(e) => setIsCompleted(e.target.value === "true")}
            style={inputStyle}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </td>

        <td style={tdStyle}>{event.isActive ? "Active" : "Inactive"}</td>

<td style={{ ...tdStyle, whiteSpace: "nowrap", minWidth: "160px" }}>
  <TableActionGroup style={{ flexWrap: "nowrap", whiteSpace: "nowrap" }}>
    <form id={formId} action={updateProjectEvent} style={{ margin: 0 }}>
      <input type="hidden" name="id" value={event.id} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="eventDate" value={eventDate} />
      <input type="hidden" name="isCompleted" value={String(isCompleted)} />
      <input type="hidden" name="completionDate" value={completionDate} />
      <input type="hidden" name="customName" value={customName} />
      <input type="hidden" name="reportingName" value={reportingName} />
      <input type="hidden" name="visibility" value={visibility} />
      <input
        type="hidden"
        name="linkedProjectWorkstreamId"
        value={linkedProjectWorkstreamId}
      />

      <button type="submit" style={{ ...tableButtonStyle, whiteSpace: "nowrap" }}>
        <TranslatedButtonLabel labelKey="actions.save" />
      </button>
    </form>

    <button
      type="button"
      style={tableButtonStyle}
      onClick={() => setShowDetails(!showDetails)}
    >
      <TranslatedButtonLabel
        labelKey={showDetails ? "actions.hide" : "actions.details"}
      />
    </button>
  </TableActionGroup>
</td>
      </tr>

      {showDetails && (
        <tr
          style={{
            opacity: event.isActive ? 1 : 0.4,
            backgroundColor: event.isActive ? "#ffffff" : "#f8fafc",
          }}
        >
          <td style={tdStyle} colSpan={8}>
            <NestedTablePanel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
                gap: "0.75rem",
                margin: 0,
              }}
            >
              <textarea
                name="description"
                defaultValue={event.description ?? ""}
                placeholder="Description"
                style={{ ...inputStyle, minHeight: "60px" }}
                form={formId}
              />

              <input
                name="plannedQuantity"
                type="number"
                step="0.01"
                defaultValue={event.plannedQuantity ?? ""}
                placeholder="Planned qty"
                style={inputStyle}
                form={formId}
              />

              <input
                name="actualQuantity"
                type="number"
                step="0.01"
                defaultValue={event.actualQuantity ?? ""}
                placeholder="Actual qty"
                style={inputStyle}
                form={formId}
              />

              <input
                name="measureUnit"
                defaultValue={event.measureUnit ?? ""}
                placeholder="Unit"
                style={inputStyle}
                form={formId}
              />

              <select
                name="quantityType"
                defaultValue={event.quantityType ?? ""}
                style={inputStyle}
                form={formId}
              >
                <option value="">Type</option>
                <option value="FIXED">Fixed</option>
                <option value="VARIABLE">Variable</option>
              </select>

              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            </NestedTablePanel>
          </td>

          <td style={tdStyle}>
            <form
              action={toggleProjectEvent}
              style={{ margin: "0.25rem 0 0 0", display: "block" }}
            >
              <input type="hidden" name="id" value={event.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <input
                type="hidden"
                name="current"
                value={String(event.isActive)}
              />

              <button type="submit" style={tableButtonStyle}>
                {<TranslatedButtonLabel labelKey={event.isActive ? "actions.deactivate" : "actions.activate"} />}
              </button>
            </form>

            <form
              action={deleteProjectEvent}
              style={{ margin: "0.25rem 0 0 0", display: "block" }}
            >
              <input type="hidden" name="id" value={event.id} />
              <input type="hidden" name="projectId" value={projectId} />

              <button type="submit" style={tableButtonStyle}>
                <TranslatedButtonLabel labelKey="actions.delete" />
              </button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
