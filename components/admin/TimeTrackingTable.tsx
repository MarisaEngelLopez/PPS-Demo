"use client";

import { TranslatedButtonLabel } from "@/components/ui/TranslatedControls";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import { useActionToast } from "@/components/ui/useActionToast";
import { translateConfiguredOption } from "@/lib/i18n/displayTranslations";

type ActionResult = {
  ok: boolean;
  message: string;
};

type TimeEntryAction = (formData: FormData) => Promise<ActionResult | undefined>;

type ProjectOption = {
  id: string;
  projectCode: string;
  name: string;
};

type ProjectTaskOption = {
  id: string;
  name: string;
  parentTaskId: string | null;
  subtasks?: ProjectTaskOption[];
};

type ProjectWorkstreamOption = {
  id: string;
  projectId: string;
  isActive: boolean;
  governedStatus?: {
    code: string;
    name: string;
  } | null;
  workstream: {
    name: string;
    phase: {
      name: string;
    } | null;
  };
  projectTasks?: ProjectTaskOption[];
};

type TaskFamilyOption = {
  id: string;
  code?: string | null;
  name: string;
  nameEs?: string | null;
};

type TimeEntryRowData = {
  id: string;
  projectId: string;
  projectWorkstreamId: string;
  taskFamilyId: string;
  projectTaskId: string | null;
  date: Date | string | null;
  hours: number;
  notes: string | null;
};

type TimeTrackingTableProps = {
  projects: ProjectOption[];
  projectWorkstreams: ProjectWorkstreamOption[];
  taskFamilies: TaskFamilyOption[];
  defaultTaskFamilyId: string;
  timeEntries: TimeEntryRowData[];
  defaultProjectId: string;
  defaultProjectWorkstreamId: string;
  createTimeEntry: TimeEntryAction;
  updateTimeEntry: TimeEntryAction;
  deleteTimeEntry: TimeEntryAction;
};

function flattenTasks(projectWorkstream?: ProjectWorkstreamOption) {
  return (
    projectWorkstream?.projectTasks?.flatMap((task) => [
      task,
      ...(task.subtasks ?? []),
    ]) ?? []
  );
}

function formatWorkstream(projectWorkstream: ProjectWorkstreamOption) {
  const phaseName = projectWorkstream.workstream.phase?.name;
  const statusLabel = !projectWorkstream.isActive
    ? " (Inactive)"
    : projectWorkstream.governedStatus?.code === "CLOSED"
      ? " (Closed)"
      : "";
  return `${phaseName ? `${phaseName} / ` : ""}${projectWorkstream.workstream.name}${statusLabel}`;
}

function toDateInput(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

const rowActionStyle = {
  display: "flex",
  gap: "0.35rem",
  alignItems: "center",
};

export function TimeTrackingTable({
  projects,
  projectWorkstreams,
  taskFamilies,
  defaultTaskFamilyId,
  timeEntries,
  defaultProjectId,
  defaultProjectWorkstreamId,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
}: TimeTrackingTableProps) {
  const { t, locale } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const { handleAction } = useActionToast();
  const router = useRouter();

  function hasProjectWorkstreams(projectId: string) {
    return projectWorkstreams.some((pw) => pw.projectId === projectId);
  }

  function getFallbackProjectId(preferredProjectId?: string) {
    if (preferredProjectId && hasProjectWorkstreams(preferredProjectId)) {
      return preferredProjectId;
    }

    return (
      projectWorkstreams.find((pw) =>
        projects.some((project) => project.id === pw.projectId)
      )?.projectId ||
      projects[0]?.id ||
      ""
    );
  }

  const [selectedProject, setSelectedProject] = useState(
    getFallbackProjectId(defaultProjectId)
  );
  const [selectedProjectWorkstream, setSelectedProjectWorkstream] =
    useState(defaultProjectWorkstreamId);

  const filteredProjectWorkstreams = projectWorkstreams.filter(
    (pw) => pw.projectId === selectedProject
  );

  function getFallbackWorkstreamId(projectId: string, preferredWorkstreamId?: string) {
    if (
      preferredWorkstreamId &&
      projectWorkstreams.some(
        (projectWorkstream) =>
          projectWorkstream.id === preferredWorkstreamId &&
          projectWorkstream.projectId === projectId
      )
    ) {
      return preferredWorkstreamId;
    }

    return (
      projectWorkstreams.find(
        (projectWorkstream) => projectWorkstream.projectId === projectId
      )?.id ?? ""
    );
  }

  const selectedWorkstream = projectWorkstreams.find(
    (pw) => pw.id === selectedProjectWorkstream
  );

  const availableTasks = flattenTasks(selectedWorkstream);

  function getFastEntryProjectId() {
    if (typeof window === "undefined") return defaultProjectId;

    return getFallbackProjectId(
      localStorage.getItem("lastTimeEntryProjectId") ||
        selectedProject ||
        defaultProjectId
    );
  }

  function getFastEntryWorkstreamId(projectId: string) {
    if (typeof window === "undefined") return defaultProjectWorkstreamId;

    return getFallbackWorkstreamId(
      projectId,
      localStorage.getItem("lastTimeEntryProjectWorkstreamId") ||
        selectedProjectWorkstream ||
        defaultProjectWorkstreamId
    );
  }

  return (
    <>
      <SectionHeader
        title={t("timeTracking.timeEntries")}
        action={
          <AddActionButton
            onClick={() => {
              const fastProjectId = getFastEntryProjectId();
              const fastWorkstreamId = getFastEntryWorkstreamId(fastProjectId);
              setSelectedProject(fastProjectId);
              setSelectedProjectWorkstream(fastWorkstreamId);
              setIsCreating(true);
            }}
          >
            {t("timeTracking.newTimeEntry")}
          </AddActionButton>
        }
      />

      <form
        key={formVersion}
        id="create-time-entry-form"
        action={async (formData) => {
          const projectId = String(formData.get("projectId") || "");
          const nextProjectId = getFallbackProjectId(projectId);

          if (nextProjectId) {
            localStorage.setItem("lastTimeEntryProjectId", nextProjectId);
            setSelectedProject(nextProjectId);
          }
          const projectWorkstreamId = String(
            formData.get("projectWorkstreamId") || ""
          );
          if (projectWorkstreamId) {
            localStorage.setItem(
              "lastTimeEntryProjectWorkstreamId",
              projectWorkstreamId
            );
          }

          await handleAction(createTimeEntry, formData, () => {
            setSelectedProject(nextProjectId);
            setSelectedProjectWorkstream(
              getFallbackWorkstreamId(nextProjectId, projectWorkstreamId)
            );
            setFormVersion((version) => version + 1);
            setIsCreating(true);
            router.refresh();
          });
        }}
      />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t("table.date")}</th>
            <th style={thStyle}>{t("labels.project")}</th>
            <th style={thStyle}>{t("labels.workstream")}</th>
            <th style={thStyle}>{t("labels.taskFamily")}</th>
            <th style={thStyle}>{t("labels.task")}</th>
            <th style={thStyle}>{t("labels.hours")}</th>
            <th style={thStyle}>{t("labels.notes")}</th>
            <th style={thStyle}>{t("table.action")}</th>
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
                  onChange={(event) => {
                    setSelectedProject(event.target.value);
                    const nextWorkstreamId = getFallbackWorkstreamId(
                      event.target.value
                    );
                    setSelectedProjectWorkstream(nextWorkstreamId);
                    localStorage.setItem(
                      "lastTimeEntryProjectId",
                      event.target.value
                    );
                    if (nextWorkstreamId) {
                      localStorage.setItem(
                        "lastTimeEntryProjectWorkstreamId",
                        nextWorkstreamId
                      );
                    }
                  }}
                  style={inputStyle}
                  form="create-time-entry-form"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectCode} - {project.name}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <select
                  name="projectWorkstreamId"
                  required
                  value={selectedProjectWorkstream}
                  onChange={(event) => {
                    setSelectedProjectWorkstream(event.target.value);
                    localStorage.setItem(
                      "lastTimeEntryProjectWorkstreamId",
                      event.target.value
                    );
                  }}
                  style={inputStyle}
                  form="create-time-entry-form"
                >
                  <option value="">{t("timeTracking.selectWorkstream")}</option>
                  {filteredProjectWorkstreams.map((projectWorkstream) => (
                    <option
                      key={projectWorkstream.id}
                      value={projectWorkstream.id}
                    >
                      {formatWorkstream(projectWorkstream)}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <select
                  name="taskFamilyId"
                  required
                  defaultValue={defaultTaskFamilyId || ""}
                  style={inputStyle}
                  form="create-time-entry-form"
                >
                  <option value="">{t("timeTracking.selectFamily")}</option>
                  {taskFamilies.map((taskFamily) => (
                    <option key={taskFamily.id} value={taskFamily.id}>
                      {translateConfiguredOption(taskFamily, locale, t, "taskFamily")}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <select
                  name="projectTaskId"
                  defaultValue=""
                  style={inputStyle}
                  form="create-time-entry-form"
                >
                  <option value="">{t("timeTracking.noTask")}</option>
                  {availableTasks.map((task) => (
                    <option
                      key={`${task.parentTaskId ? "subtask" : "task"}-${task.id}`}
                      value={task.id}
                    >
                      {task.parentTaskId ? "-> " : ""}
                      {task.name}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <input
                  name="hours"
                  type="number"
                  step="0.25"
                  min="0.25"
                  required
                  placeholder="0"
                  style={inputStyle}
                  form="create-time-entry-form"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="notes"
                  placeholder={t("labels.notes")}
                  style={inputStyle}
                  form="create-time-entry-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <div style={rowActionStyle}>
                  <button
                    type="submit"
                    form="create-time-entry-form"
                    style={tableButtonStyle}
                  >
                    <TranslatedButtonLabel labelKey="actions.save" />
                  </button>
                  <button
                    type="button"
                    style={tableButtonStyle}
                    onClick={() => setIsCreating(false)}
                  >
                    <TranslatedButtonLabel labelKey="actions.cancel" />
                  </button>
                </div>
              </td>
            </tr>
          )}

          {!isCreating && timeEntries.length === 0 && (
            <tr>
              <td style={tdStyle} colSpan={8}>
                {t("timeTracking.noEntries")}
              </td>
            </tr>
          )}

          {timeEntries.map((entry) => (
            <TimeEntryRow
              key={entry.id}
              entry={entry}
              projects={projects}
              projectWorkstreams={projectWorkstreams}
              taskFamilies={taskFamilies}
              updateTimeEntry={updateTimeEntry}
              deleteTimeEntry={deleteTimeEntry}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}

function TimeEntryRow({
  entry,
  projects,
  projectWorkstreams,
  taskFamilies,
  updateTimeEntry,
  deleteTimeEntry,
}: {
  entry: TimeEntryRowData;
  projects: ProjectOption[];
  projectWorkstreams: ProjectWorkstreamOption[];
  taskFamilies: TaskFamilyOption[];
  updateTimeEntry: TimeEntryAction;
  deleteTimeEntry: TimeEntryAction;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState(entry.projectId);
  const [selectedProjectWorkstream, setSelectedProjectWorkstream] = useState(
    entry.projectWorkstreamId
  );
  const [selectedTaskFamily, setSelectedTaskFamily] = useState(entry.taskFamilyId);
  const [selectedTask, setSelectedTask] = useState(entry.projectTaskId ?? "");
  const [date, setDate] = useState(toDateInput(entry.date));
  const [hours, setHours] = useState(String(entry.hours));
  const [notes, setNotes] = useState(entry.notes ?? "");
  const { handleAction } = useActionToast();

  const filteredProjectWorkstreams = projectWorkstreams.filter(
    (projectWorkstream) => projectWorkstream.projectId === selectedProject
  );

  const selectedWorkstream = projectWorkstreams.find(
    (projectWorkstream) => projectWorkstream.id === selectedProjectWorkstream
  );

  const availableTasks = flattenTasks(selectedWorkstream);
  const formId = `time-entry-form-${entry.id}`;

  return (
    <tr>
      <td style={tdStyle}>
        <input
          name="date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          style={inputStyle}
          form={formId}
        />
      </td>

      <td style={tdStyle}>
        <select
          name="projectId"
          value={selectedProject}
          onChange={(event) => {
            setSelectedProject(event.target.value);
            setSelectedProjectWorkstream("");
            setSelectedTask("");
          }}
          style={inputStyle}
          form={formId}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.projectCode} - {project.name}
            </option>
          ))}
        </select>
      </td>

      <td style={tdStyle}>
        <select
          name="projectWorkstreamId"
          value={selectedProjectWorkstream}
          onChange={(event) => {
            setSelectedProjectWorkstream(event.target.value);
            setSelectedTask("");
          }}
          style={inputStyle}
          form={formId}
        >
          <option value="">{t("timeTracking.selectWorkstream")}</option>
          {filteredProjectWorkstreams.map((projectWorkstream) => (
            <option
              key={projectWorkstream.id}
              value={projectWorkstream.id}
            >
              {formatWorkstream(projectWorkstream)}
            </option>
          ))}
        </select>
      </td>

      <td style={tdStyle}>
        <select
          name="taskFamilyId"
          value={selectedTaskFamily}
          onChange={(event) => setSelectedTaskFamily(event.target.value)}
          style={inputStyle}
          form={formId}
        >
          {taskFamilies.map((taskFamily) => (
            <option key={taskFamily.id} value={taskFamily.id}>
              {translateConfiguredOption(taskFamily, locale, t, "taskFamily")}
            </option>
          ))}
        </select>
      </td>

      <td style={tdStyle}>
        <select
          name="projectTaskId"
          value={selectedTask}
          onChange={(event) => setSelectedTask(event.target.value)}
          style={inputStyle}
          form={formId}
        >
          <option value="">{t("timeTracking.noTask")}</option>
          {availableTasks.map((task) => (
            <option
              key={`${task.parentTaskId ? "subtask" : "task"}-${task.id}`}
              value={task.id}
            >
              {task.parentTaskId ? "-> " : ""}
              {task.name}
            </option>
          ))}
        </select>
      </td>

      <td style={tdStyle}>
        <input
          name="hours"
          type="number"
          step="0.25"
          min="0.25"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          style={inputStyle}
          form={formId}
        />
      </td>

      <td style={tdStyle}>
        <input
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          style={inputStyle}
          form={formId}
        />
      </td>

      <td style={tdStyle}>
        <form
          id={formId}
          action={async (formData) => {
            await handleAction(updateTimeEntry, formData, () => router.refresh());
          }}
          style={{ margin: 0 }}
        >
          <input type="hidden" name="id" value={entry.id} />
        </form>

        <div style={rowActionStyle}>
          <button type="submit" form={formId} style={tableButtonStyle}>
            <TranslatedButtonLabel labelKey="actions.save" />
          </button>

          <form
            action={async (formData) => {
              await handleAction(deleteTimeEntry, formData, () => router.refresh());
            }}
            style={{ margin: 0 }}
          >
            <input type="hidden" name="id" value={entry.id} />
            <button type="submit" style={tableButtonStyle}>
              <TranslatedButtonLabel labelKey="actions.delete" />
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
