"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  inputStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { StandardTable, TableActionGroup } from "@/components/ui/TablePrimitives";
import { thStyle, tdStyle } from "@/components/ui/tableStyles";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { NestedTablePanel } from "@/components/ui/NestedTablePanel";
import {
  TranslatedButtonLabel,
  TranslatedText,
  TranslatedTableButton,
} from "@/components/ui/TranslatedControls";
import {
  SectionHeader,
  SectionHeaderActionButton,
  SectionHeaderActions,
} from "@/components/ui/SectionHeader";
import { getVisibilityOptions } from "@/lib/i18n/displayTranslations";

type ActionResult = { ok: boolean; message: string };
type ProjectAction = (formData: FormData) => Promise<ActionResult | undefined>;
type ClientProjectAction = (formData: FormData) => Promise<void>;

type WorkstreamOption = {
  id: string;
  name: string;
  phase?: { name: string | null } | null;
};

type ProjectTaskRow = {
  id: string;
  projectWorkstreamId: string;
  parentTaskId: string | null;
  name: string;
  sortOrder: number;
  visibility: string;
  plannedStartDate: Date | string | null;
  plannedEndDate: Date | string | null;
  actualStartDate: Date | string | null;
  actualEndDate: Date | string | null;
  subtasks?: ProjectTaskRow[];
};

type ProjectWorkstreamRowData = {
  id: string;
  isActive: boolean;
  customName: string | null;
  reportingName: string | null;
  objective: string | null;
  deliverable: string | null;
  visibility: string | null;
  plannedStartDate: Date | string | null;
  plannedEndDate: Date | string | null;
  actualStartDate: Date | string | null;
  actualEndDate: Date | string | null;
  plannedQuantity: number | null;
  actualQuantity: number | null;
  measureUnit: string | null;
  quantityType: string | null;
  workstream?: {
    name: string | null;
    phase?: { name: string | null } | null;
  } | null;
  projectTasks?: ProjectTaskRow[];
};

type ProjectWorkstreamsTableProps = {
  projectId: string;
  availableWorkstreams?: WorkstreamOption[];
  projectWorkstreams?: ProjectWorkstreamRowData[];
  createProjectWorkstream: ProjectAction;
  updateProjectWorkstream: ProjectAction;
  toggleProjectWorkstream: ProjectAction;
  deleteProjectWorkstream: ProjectAction;
  createProjectTask: ProjectAction;
  updateProjectTask: ProjectAction;
  deleteProjectTask: ProjectAction;
  createSubtask: ProjectAction;
};

type ProjectWorkstreamRowProps = {
  projectId: string;
  pw: ProjectWorkstreamRowData;
  showTasks: boolean;
  onToggleTasks: () => void;
  updateProjectWorkstream: ClientProjectAction;
  toggleProjectWorkstream: ClientProjectAction;
  deleteProjectWorkstream: ClientProjectAction;
  createProjectTask: ClientProjectAction;
  updateProjectTask: ClientProjectAction;
  deleteProjectTask: ClientProjectAction;
  createSubtask: ClientProjectAction;
};

export function ProjectWorkstreamsTable({
  projectId,
  availableWorkstreams = [],
  projectWorkstreams = [],
  createProjectWorkstream,
 updateProjectWorkstream,
 toggleProjectWorkstream,
  deleteProjectWorkstream,
createProjectTask,
updateProjectTask,
deleteProjectTask,
createSubtask,
}: ProjectWorkstreamsTableProps) {

  const [isCreating, setIsCreating] = useState(false);
  const [expandedWorkstreamIds, setExpandedWorkstreamIds] = useState<string[]>([]);
  const { handleAction } = useActionToast();
  const { t } = useTranslation();
  const visibilityOptions = getVisibilityOptions(t);
  const router = useRouter();
  const workstreamsWithTasks = projectWorkstreams.filter(
    (pw) => getTaskCounts(pw).total > 0
  );
  const allTaskPanelsExpanded =
    workstreamsWithTasks.length > 0 &&
    workstreamsWithTasks.every((pw) => expandedWorkstreamIds.includes(pw.id));

  async function handleCreate(formData: FormData) {
    await handleAction(createProjectWorkstream, formData, () => {
      setIsCreating(false);
      router.refresh();
    });
  }

  async function handleUpdateWorkstream(formData: FormData) {
  await handleAction(updateProjectWorkstream, formData, () => router.refresh());
}

async function handleCreateTask(formData: FormData) {
  await handleAction(createProjectTask, formData, () => router.refresh());
}

async function handleUpdateTask(formData: FormData) {
  await handleAction(updateProjectTask, formData, () => router.refresh());
}

async function handleDeleteTask(formData: FormData) {
  await handleAction(deleteProjectTask, formData, () => router.refresh());
}

  async function handleToggle(formData: FormData) {
    await handleAction(toggleProjectWorkstream, formData, () => router.refresh());
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteProjectWorkstream, formData, () => router.refresh());
  }

async function handleCreateSubtask(formData: FormData) {
  await handleAction(createSubtask, formData, () => router.refresh());
}

function expandWorkstreamsWithTasks() {
  setExpandedWorkstreamIds(workstreamsWithTasks.map((pw) => pw.id));
}

function collapseAllWorkstreams() {
  setExpandedWorkstreamIds([]);
}

function toggleTaskPanel(workstreamId: string) {
  setExpandedWorkstreamIds((current) =>
    current.includes(workstreamId)
      ? current.filter((id) => id !== workstreamId)
      : [...current, workstreamId]
  );
}

  return (
    <>

<SectionHeader
  title={t("workstreams.projectTitle")}

  action={
    <SectionHeaderActions>
      <SectionHeaderActionButton
        onClick={expandWorkstreamsWithTasks}
        inactive={allTaskPanelsExpanded || workstreamsWithTasks.length === 0}
        labelKey="actions.expandAll"
      />
      <SectionHeaderActionButton
        onClick={collapseAllWorkstreams}
        inactive={!allTaskPanelsExpanded}
        labelKey="actions.collapseAll"
      />
      <AddActionButton
        type="button"
        onClick={() => setIsCreating(true)}
        labelKey="workstreams.add"
      />
    </SectionHeaderActions>
  }
/>

      <form id="create-workstream-form" action={handleCreate} />
      <input
        type="hidden"
        name="projectId"
        value={projectId}
        form="create-workstream-form"
      />

      <StandardTable>
        <thead>
          <tr>
  <th style={thStyle}><TranslatedText labelKey="labels.phase" /></th>
  <th style={thStyle}><TranslatedText labelKey="labels.workstream" /></th>
  <th style={thStyle}><TranslatedText labelKey="labels.customName" /></th>
  <th style={thStyle}><TranslatedText labelKey="labels.reportingName" /></th>
  <th style={thStyle}><TranslatedText labelKey="labels.visibility" /></th>
  <th style={thStyle}><TranslatedText labelKey="labels.plannedStart" /></th>
  <th style={thStyle}><TranslatedText labelKey="labels.plannedEnd" /></th>
  <th style={thStyle}><TranslatedText labelKey="labels.actualStart" /></th>
  <th style={thStyle}><TranslatedText labelKey="labels.actualEnd" /></th>
  <th style={thStyle}><TranslatedText labelKey="labels.status" /></th>
  <th style={thStyle}><TranslatedText labelKey="labels.action" /></th>
</tr>
        </thead>

        <tbody>
 {isCreating && (
  <>
    <tr>
      <td style={tdStyle}>—</td>

      <td style={tdStyle}>
        <select
          name="workstreamId"
          required
          style={inputStyle}
          form="create-workstream-form"
        >
          <option value="">{t("timeTracking.selectWorkstream")}</option>
          {(availableWorkstreams ?? []).map((w) => (
            <option key={w.id} value={w.id}>
              {w.phase?.name ? `${w.phase.name} - ${w.name}` : w.name}
            </option>
          ))}
        </select>
      </td>

      <td style={tdStyle}>
        <input
          name="customName"
          placeholder="Custom name"
          style={inputStyle}
          form="create-workstream-form"
        />
      </td>

      <td style={tdStyle}>
        <input
          name="reportingName"
          placeholder="Reporting name"
          style={inputStyle}
          form="create-workstream-form"
        />
      </td>

      <td style={tdStyle}>
        <select
          name="visibility"
          defaultValue="BOTH"
          style={inputStyle}
          form="create-workstream-form"
        >
          {visibilityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </td>

      <td style={tdStyle}>
        <input
          type="date"
          name="plannedStartDate"
          style={inputStyle}
          form="create-workstream-form"
        />
      </td>

      <td style={tdStyle}>
        <input
          type="date"
          name="plannedEndDate"
          style={inputStyle}
          form="create-workstream-form"
        />
      </td>

      <td style={tdStyle}>
        <input
          type="date"
          name="actualStartDate"
          style={inputStyle}
          form="create-workstream-form"
        />
      </td>

      <td style={tdStyle}>
        <input
          type="date"
          name="actualEndDate"
          style={inputStyle}
          form="create-workstream-form"
        />
      </td>

     <td style={tdStyle}>Open</td>

      <td style={tdStyle}>
        <TranslatedTableButton
          type="submit"
          form="create-workstream-form"
          labelKey="actions.save"
        />{" "}
        <TranslatedTableButton
          type="button"
          onClick={() => setIsCreating(false)}
          labelKey="actions.cancel"
        />
      </td>
    </tr>

    <tr>
      <td style={tdStyle} colSpan={11}>
        <NestedTablePanel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr",
            gap: "0.75rem",
          }}
        >
          <textarea
            name="objective"
            placeholder="Objective"
            style={{ ...inputStyle, minHeight: "70px" }}
            form="create-workstream-form"
          />

          <textarea
            name="deliverable"
            placeholder="Deliverable"
            style={{ ...inputStyle, minHeight: "70px" }}
            form="create-workstream-form"
          />

          <input
            name="plannedQuantity"
            type="number"
            step="0.01"
            placeholder="Planned qty"
            style={inputStyle}
            form="create-workstream-form"
          />

          <input
            name="actualQuantity"
            type="number"
            step="0.01"
            placeholder="Actual qty"
            style={inputStyle}
            form="create-workstream-form"
          />

          <input
            name="measureUnit"
            placeholder="Unit"
            style={inputStyle}
            form="create-workstream-form"
          />

          <select
            name="quantityType"
            defaultValue=""
            style={inputStyle}
            form="create-workstream-form"
          >
            <option value="">Type</option>
            <option value="FIXED">Fixed</option>
            <option value="VARIABLE">Variable</option>
          </select>
        </div>
        </NestedTablePanel>
      </td>
    </tr>
  </>
)}

          {(projectWorkstreams ?? []).map((pw) => (
            <ProjectWorkstreamRow
  key={`workstream-row-${pw.id}`}
  projectId={projectId}
  pw={pw}
  showTasks={expandedWorkstreamIds.includes(pw.id)}
  onToggleTasks={() => toggleTaskPanel(pw.id)}
  updateProjectWorkstream={handleUpdateWorkstream}
  toggleProjectWorkstream={handleToggle}
  deleteProjectWorkstream={handleDelete}
createProjectTask={handleCreateTask}
updateProjectTask={handleUpdateTask}
  deleteProjectTask={handleDeleteTask}
createSubtask={handleCreateSubtask}
/>
          ))}
        </tbody>
      </StandardTable>
    </>
  );
}

function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function getTaskCounts(pw: ProjectWorkstreamRowData) {
  const tasks = pw.projectTasks ?? [];
  const subtasks = tasks.reduce(
    (count, task) => count + (task.subtasks?.length ?? 0),
    0
  );

  return {
    tasks: tasks.length,
    subtasks,
    total: tasks.length + subtasks,
  };
}

function ProjectWorkstreamRow({
  projectId,
  pw,
  showTasks,
  onToggleTasks,
  updateProjectWorkstream,
  toggleProjectWorkstream,
  deleteProjectWorkstream,
createProjectTask,
updateProjectTask,
deleteProjectTask,
 createSubtask,
}: ProjectWorkstreamRowProps) {
  const { t } = useTranslation();
  const visibilityOptions = getVisibilityOptions(t);
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
const taskGridColumns =  "minmax(180px, 2fr) 70px 110px 120px 120px 120px 120px 70px";
const formId = `workstream-form-${pw.id}`;
const [showDetails, setShowDetails] = useState(false);
const [customName, setCustomName] = useState(pw.customName ?? "");
const [reportingName, setReportingName] = useState(pw.reportingName ?? "");
const [visibility, setVisibility] = useState(pw.visibility ?? "BOTH");
const [openSubtaskForTaskId, setOpenSubtaskForTaskId] = useState<string | null>(null);
const taskCounts = getTaskCounts(pw);
const taskInputStyle = {
  ...inputStyle,
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box" as const,
};
const [showAddTask, setShowAddTask] = useState(false);

  return (
    <>
      <tr
        id={`project-workstream-${pw.id}`}
        style={{
          opacity: pw.isActive ? 1 : 0.4,
          backgroundColor: pw.isActive ? "transparent" : "#f8fafc",
        }}
      >
        <td style={tdStyle}>{pw.workstream?.phase?.name ?? "-"}</td>
        <td style={tdStyle}>{pw.workstream?.name ?? "-"}</td>
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

<td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
  <TableActionGroup style={{ flexWrap: "nowrap", whiteSpace: "nowrap" }}>
    <form id={formId} action={updateProjectWorkstream} style={{ margin: 0 }}>
      <input type="hidden" name="id" value={pw.id} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="plannedStartDate" value={plannedStartDate} />
      <input type="hidden" name="plannedEndDate" value={plannedEndDate} />
      <input type="hidden" name="actualStartDate" value={actualStartDate} />
      <input type="hidden" name="actualEndDate" value={actualEndDate} />
      <input type="hidden" name="customName" value={customName} />
      <input type="hidden" name="reportingName" value={reportingName} />
      <input type="hidden" name="visibility" value={visibility} />

      <TranslatedTableButton
        type="submit"
        style={{ ...tableButtonStyle, whiteSpace: "nowrap" }}
        labelKey="actions.save"
      />
    </form>

    <TranslatedTableButton
      type="button"
      onClick={() => setShowDetails(!showDetails)}
      labelKey={showDetails ? "actions.hide" : "actions.details"}
    />

    <button
      type="button"
      style={tableButtonStyle}
      onClick={onToggleTasks}
    >
      <TranslatedButtonLabel
        labelKey={showTasks ? "actions.hide" : "actions.tasks"}
      />{" "}
      {taskCounts.tasks}
      {taskCounts.subtasks ? ` + ${taskCounts.subtasks}` : ""}
    </button>
  </TableActionGroup>
</td>
      </tr>

     {showDetails && (
  <tr
    style={{
      opacity: pw.isActive ? 1 : 0.4,
      backgroundColor: pw.isActive ? "#ffffff" : "#f8fafc",
    }}
  >
    <td style={tdStyle} colSpan={10}>
      <NestedTablePanel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr",
          gap: "0.75rem",
          margin: 0,
        }}
      >
        <textarea
          name="objective"
          defaultValue={pw.objective ?? ""}
          placeholder="Objective"
          style={{ ...inputStyle, minHeight: "60px" }}
          form={formId}
        />

        <textarea
          name="deliverable"
          defaultValue={pw.deliverable ?? ""}
          placeholder="Deliverable"
          style={{ ...inputStyle, minHeight: "60px" }}
          form={formId}
        />

        <input
          name="plannedQuantity"
          type="number"
          step="0.01"
          defaultValue={pw.plannedQuantity ?? ""}
          placeholder="Planned qty"
          style={inputStyle}
          form={formId}
        />

        <input
          name="actualQuantity"
          type="number"
          step="0.01"
          defaultValue={pw.actualQuantity ?? ""}
          placeholder="Actual qty"
          style={inputStyle}
          form={formId}
        />

        <input
          name="measureUnit"
          defaultValue={pw.measureUnit ?? ""}
          placeholder="Unit"
          style={inputStyle}
          form={formId}
        />

        <select
          name="quantityType"
          defaultValue={pw.quantityType ?? ""}
          style={inputStyle}
          form={formId}
        >
          <option value="">Type</option>
          <option value="FIXED">Fixed</option>
          <option value="VARIABLE">Variable</option>
        </select>
      </div>
      </NestedTablePanel>
    </td>

    <td style={tdStyle}>
      <form
        action={toggleProjectWorkstream}
        style={{ margin: "0.25rem 0 0 0", display: "block" }}
      >
        <input type="hidden" name="id" value={pw.id} />
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="current" value={String(pw.isActive)} />

        <TranslatedTableButton
          type="submit"
          labelKey={pw.isActive ? "actions.deactivate" : "actions.activate"}
        />
      </form>

      <form
        action={deleteProjectWorkstream}
        style={{ margin: "0.25rem 0 0 0", display: "block" }}
      >
        <input type="hidden" name="id" value={pw.id} />
        <input type="hidden" name="projectId" value={projectId} />

        <TranslatedTableButton type="submit" labelKey="actions.delete" />
           </form>
    </td>
  </tr>
)}

{showTasks && (
  <tr>
    <td style={tdStyle}></td>

    <td style={tdStyle} colSpan={10}>
      <NestedTablePanel>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <strong>
          <TranslatedText labelKey="sections.workstreamTasks" />
        </strong>

<div
  style={{
    display: "grid",
    gridTemplateColumns: taskGridColumns,
    gap: "0.5rem",
    fontSize: "0.75rem",
    fontWeight: "bold",
    color: "#64748b",
  }}
>
<span><TranslatedText labelKey="labels.task" /></span>
<span><TranslatedText labelKey="labels.order" /></span>
<span><TranslatedText labelKey="labels.visibility" /></span>
<span><TranslatedText labelKey="labels.plannedStart" /></span>
<span><TranslatedText labelKey="labels.plannedEnd" /></span>
<span><TranslatedText labelKey="labels.actualStart" /></span>
<span><TranslatedText labelKey="labels.actualEnd" /></span>
<span><TranslatedText labelKey="labels.action" /></span>
</div>


{(pw.projectTasks ?? [])
  .filter((task) => !task.parentTaskId)
  .map((task) => (
    <div key={`task-panel-${task.id}`}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: taskGridColumns,
          gap: "0.5rem",
          alignItems: "center",
        }}
      >
        <form
          id={`task-form-${task.id}`}
          action={updateProjectTask}
          style={{ display: "contents" }}
        >
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="projectWorkstreamId" value={pw.id} />

          <input
            name="name"
            defaultValue={task.name ?? ""}
            placeholder="Task name"
            style={taskInputStyle}
          />

          <input
            name="sortOrder"
            type="number"
            defaultValue={task.sortOrder ?? 100}
            placeholder="Order"
            style={taskInputStyle}
          />

          <select
            key={`task-visibility-${task.id}-${task.visibility ?? "BOTH"}`}
            name="visibility"
            defaultValue={task.visibility ?? "BOTH"}
            style={taskInputStyle}
          >
            {visibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            name="plannedStartDate"
            type="date"
            defaultValue={toDateInputValue(task.plannedStartDate)}
            style={taskInputStyle}
          />

          <input
            name="plannedEndDate"
            type="date"
            defaultValue={toDateInputValue(task.plannedEndDate)}
            style={taskInputStyle}
          />

          <input
            name="actualStartDate"
            type="date"
            defaultValue={toDateInputValue(task.actualStartDate)}
            style={taskInputStyle}
          />

          <input
            name="actualEndDate"
            type="date"
            defaultValue={toDateInputValue(task.actualEndDate)}
            style={taskInputStyle}
          />
        </form>

        <div style={{ display: "flex", gap: "0.25rem" }}>
          <TranslatedTableButton
            type="submit"
            form={`task-form-${task.id}`}
            labelKey="actions.save"
          />

          <form action={deleteProjectTask} style={{ margin: 0 }}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <TranslatedTableButton type="submit" labelKey="actions.delete" />
          </form>
        </div>
      </div>

      {(task.subtasks ?? []).map((subtask) => (
        <div
          key={`subtask-panel-${subtask.id}`}
          style={{
            display: "grid",
            gridTemplateColumns: taskGridColumns,
            gap: "0.5rem",
            alignItems: "center",
            marginLeft: "1.5rem",
            marginTop: "0.25rem",
            opacity: 0.95,
          }}
        >
          <form
            id={`task-form-${subtask.id}`}
            action={updateProjectTask}
            style={{ display: "contents" }}
          >
            <input type="hidden" name="id" value={subtask.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="projectWorkstreamId" value={pw.id} />
            <input type="hidden" name="parentTaskId" value={task.id} />

            <input
              name="name"
              defaultValue={subtask.name ?? ""}
              placeholder="Subtask name"
              style={taskInputStyle}
            />

            <input
              name="sortOrder"
              type="number"
              defaultValue={subtask.sortOrder ?? 100}
              placeholder="Order"
              style={taskInputStyle}
            />

            <select
              key={`subtask-visibility-${subtask.id}-${subtask.visibility ?? "BOTH"}`}
              name="visibility"
              defaultValue={subtask.visibility ?? "BOTH"}
              style={taskInputStyle}
            >
              {visibilityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              name="plannedStartDate"
              type="date"
              defaultValue={toDateInputValue(subtask.plannedStartDate)}
              style={taskInputStyle}
            />

            <input
              name="plannedEndDate"
              type="date"
              defaultValue={toDateInputValue(subtask.plannedEndDate)}
              style={taskInputStyle}
            />

            <input
              name="actualStartDate"
              type="date"
              defaultValue={toDateInputValue(subtask.actualStartDate)}
              style={taskInputStyle}
            />

            <input
              name="actualEndDate"
              type="date"
              defaultValue={toDateInputValue(subtask.actualEndDate)}
              style={taskInputStyle}
            />
          </form>

          <div style={{ display: "flex", gap: "0.25rem" }}>
            <TranslatedTableButton
              type="submit"
              form={`task-form-${subtask.id}`}
              labelKey="actions.save"
            />

            <form action={deleteProjectTask} style={{ margin: 0 }}>
              <input type="hidden" name="id" value={subtask.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <TranslatedTableButton type="submit" labelKey="actions.delete" />
            </form>
          </div>
        </div>
      ))}

      {openSubtaskForTaskId !== task.id && (
  <button
    type="button"
    style={{ ...tableButtonStyle, width: "fit-content", marginLeft: "1.5rem" }}
    onClick={() => setOpenSubtaskForTaskId(task.id)}
  >
    <TranslatedButtonLabel labelKey="actions.addSubtask" />
  </button>
)}

{openSubtaskForTaskId === task.id && (
  <form
    action={createSubtask}
    style={{
      display: "grid",
      gridTemplateColumns: taskGridColumns,
      gap: "0.5rem",
      alignItems: "center",
      marginLeft: "1.5rem",
      marginTop: "0.25rem",
    }}
  >
    <input type="hidden" name="projectWorkstreamId" value={pw.id} />
    <input type="hidden" name="projectId" value={projectId} />
    <input type="hidden" name="parentTaskId" value={task.id} />

    <input name="name" placeholder="+ Add subtask" style={taskInputStyle} />
    <input name="sortOrder" type="number" placeholder="Order" style={taskInputStyle} />

    <select name="visibility" defaultValue="BOTH" style={taskInputStyle}>
      {visibilityOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>

    <input name="plannedStartDate" type="date" style={taskInputStyle} />
    <input name="plannedEndDate" type="date" style={taskInputStyle} />
    <input name="actualStartDate" type="date" style={taskInputStyle} />
    <input name="actualEndDate" type="date" style={taskInputStyle} />

    <div style={{ display: "flex", gap: "0.25rem" }}>
      <TranslatedTableButton type="submit" labelKey="actions.add" />

      <TranslatedTableButton
        type="button"
        onClick={() => setOpenSubtaskForTaskId(null)}
        labelKey="actions.cancel"
      />
    </div>
  </form>
)}

    </div>
  ))}

  {!showAddTask && (
  <button
    type="button"
    style={{ ...tableButtonStyle, width: "fit-content" }}
    onClick={() => setShowAddTask(true)}
  >
    <TranslatedButtonLabel labelKey="actions.addTask" />
  </button>
)}

{showAddTask && (
  <form
    action={createProjectTask}
    style={{
      display: "grid",
      gridTemplateColumns: taskGridColumns,
      gap: "0.5rem",
      alignItems: "center",
    }}
  >
    <input type="hidden" name="projectWorkstreamId" value={pw.id} />
    <input type="hidden" name="projectId" value={projectId} />

    <input name="name" required placeholder="New task name" style={taskInputStyle} />
    <input name="sortOrder" type="number" defaultValue={100} style={taskInputStyle} />
    <select name="visibility" defaultValue="BOTH" style={taskInputStyle}>
      {visibilityOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>

    <input name="plannedStartDate" type="date" style={taskInputStyle} />
    <input name="plannedEndDate" type="date" style={taskInputStyle} />
    <input name="actualStartDate" type="date" style={taskInputStyle} />
    <input name="actualEndDate" type="date" style={taskInputStyle} />

    <div style={{ display: "flex", gap: "0.25rem" }}>
      <TranslatedTableButton type="submit" labelKey="actions.add" />

      <TranslatedTableButton
        type="button"
        onClick={() => setShowAddTask(false)}
        labelKey="actions.cancel"
      />
    </div>
  </form>
)}
</div>
      </NestedTablePanel>
    </td>
  </tr>
)}
    </>
  );
}
