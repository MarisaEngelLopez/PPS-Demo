"use client";

import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import type {
  TaskFamilyActionResult,
  TaskFamilyAdminRow,
} from "@/lib/domain/taskFamilies/taskFamilyTypes";

type ActionHandler = (
  formData: FormData
) => Promise<TaskFamilyActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

export function TaskFamiliesTable({
  taskFamilies,
  createTaskFamily,
  updateTaskFamily,
  toggleTaskFamily,
  deleteTaskFamily,
}: {
  taskFamilies: TaskFamilyAdminRow[];
  createTaskFamily: ActionHandler;
  updateTaskFamily: ActionHandler;
  toggleTaskFamily: ActionHandler;
  deleteTaskFamily: ActionHandler;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(createTaskFamily, formData, () => setIsCreating(false));
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updateTaskFamily, formData);
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleTaskFamily, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteTaskFamily, formData);
  }

  return (
    <>
      <SectionHeader
        title={<TranslatedText labelKey="labels.taskFamily" />}
        action={
          <AddActionButton onClick={() => setIsCreating(true)}>
            <TranslatedText labelKey="actions.newTaskFamily" />
          </AddActionButton>
        }
      />

      <form id="create-task-family-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.code" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.name" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.sort" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.active" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.timeEntries" /></th>
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
                  placeholder="CODE"
                  style={inputStyle}
                  form="create-task-family-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="name"
                  required
                  placeholder="Name"
                  style={inputStyle}
                  form="create-task-family-form"
                  autoComplete="off"
                />
                <input
                  type="hidden"
                  name="nameEs"
                  value=""
                  form="create-task-family-form"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={100}
                  style={inputStyle}
                  form="create-task-family-form"
                />
              </td>

              <td style={tdStyle}><TranslatedText labelKey="labels.new" /></td>
              <td style={tdStyle}>0</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-task-family-form"
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

          {taskFamilies.map((taskFamily) => (
            <TaskFamilyRow
              key={taskFamily.id}
              taskFamily={taskFamily}
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

function TaskFamilyRow({
  taskFamily,
  handleUpdate,
  handleToggle,
  handleDelete,
}: {
  taskFamily: TaskFamilyAdminRow;
  handleUpdate: ClientActionHandler;
  handleToggle: ClientActionHandler;
  handleDelete: ClientActionHandler;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    code: taskFamily.code ?? "",
    name: taskFamily.name ?? "",
    nameEs: taskFamily.nameEs ?? "",
    sortOrder: taskFamily.sortOrder ?? 100,
  });

  function resetDraft() {
    setDraft({
      code: taskFamily.code ?? "",
      name: taskFamily.name ?? "",
      nameEs: taskFamily.nameEs ?? "",
      sortOrder: taskFamily.sortOrder ?? 100,
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
          taskFamily.code
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
          taskFamily.name
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
          taskFamily.sortOrder
        )}
      </td>

      <td style={tdStyle}>
        <TranslatedText labelKey={taskFamily.isActive ? "labels.active" : "labels.inactive"} />
      </td>
      <td style={tdStyle}>{taskFamily.timeEntryCount}</td>

      <td style={tdStyle}>
        {isEditing ? (
          <>
            <form action={handleUpdate} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={taskFamily.id} />
              <input type="hidden" name="code" value={draft.code} />
              <input type="hidden" name="name" value={draft.name} />
              <input type="hidden" name="nameEs" value={draft.nameEs} />
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
            <button
              type="button"
              style={tableButtonStyle}
              onClick={() => setIsEditing(true)}
            >
              <TranslatedButtonLabel labelKey="actions.edit" />
            </button>{" "}
            <form action={handleToggle} style={{ margin: 0, display: "inline" }}>
              <input type="hidden" name="id" value={taskFamily.id} />
              <input
                type="hidden"
                name="current"
                value={String(taskFamily.isActive)}
              />
              <button type="submit" style={tableButtonStyle}>
                {<TranslatedButtonLabel labelKey={taskFamily.isActive ? "actions.deactivate" : "actions.activate"} />}
              </button>
            </form>{" "}
            <form action={handleDelete} style={{ margin: 0, display: "inline" }}>
              <input type="hidden" name="id" value={taskFamily.id} />
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
