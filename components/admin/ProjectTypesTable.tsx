"use client";

import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import type {
  ProjectTypeActionResult,
  ProjectTypeAdminRow,
} from "@/lib/domain/projectTypes/projectTypeTypes";

type ActionHandler = (
  formData: FormData
) => Promise<ProjectTypeActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

export function ProjectTypesTable({
  projectTypes,
  createProjectType,
  updateProjectType,
  toggleProjectType,
  deleteProjectType,
}: {
  projectTypes: ProjectTypeAdminRow[];
  createProjectType: ActionHandler;
  updateProjectType: ActionHandler;
  toggleProjectType: ActionHandler;
  deleteProjectType: ActionHandler;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(createProjectType, formData, () => setIsCreating(false));
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updateProjectType, formData);
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleProjectType, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteProjectType, formData);
  }

  return (
    <>
      <SectionHeader
        title={<TranslatedText labelKey="labels.type" />}
        action={
          <AddActionButton onClick={() => setIsCreating(true)}>
            <TranslatedText labelKey="actions.newProjectType" />
          </AddActionButton>
        }
      />

      <form id="create-project-type-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.code" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.name" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.description" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.sort" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.active" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.projects" /></th>
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
                  form="create-project-type-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="name"
                  required
                  placeholder="Name"
                  style={inputStyle}
                  form="create-project-type-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="description"
                  placeholder="Description"
                  style={inputStyle}
                  form="create-project-type-form"
                  autoComplete="off"
                />
                <input
                  type="hidden"
                  name="nameEs"
                  value=""
                  form="create-project-type-form"
                />
                <input
                  type="hidden"
                  name="descriptionEs"
                  value=""
                  form="create-project-type-form"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={100}
                  style={inputStyle}
                  form="create-project-type-form"
                />
              </td>

              <td style={tdStyle}><TranslatedText labelKey="labels.new" /></td>
              <td style={tdStyle}>0</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-project-type-form"
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

          {projectTypes.map((projectType) => (
            <ProjectTypeRow
              key={projectType.id}
              projectType={projectType}
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

function ProjectTypeRow({
  projectType,
  handleUpdate,
  handleToggle,
  handleDelete,
}: {
  projectType: ProjectTypeAdminRow;
  handleUpdate: ClientActionHandler;
  handleToggle: ClientActionHandler;
  handleDelete: ClientActionHandler;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    code: projectType.code ?? "",
    name: projectType.name ?? "",
    nameEs: projectType.nameEs ?? "",
    description: projectType.description ?? "",
    descriptionEs: projectType.descriptionEs ?? "",
    sortOrder: projectType.sortOrder ?? 100,
  });

  function resetDraft() {
    setDraft({
      code: projectType.code ?? "",
      name: projectType.name ?? "",
      nameEs: projectType.nameEs ?? "",
      description: projectType.description ?? "",
      descriptionEs: projectType.descriptionEs ?? "",
      sortOrder: projectType.sortOrder ?? 100,
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
          projectType.code
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
          projectType.name
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
          projectType.description || "-"
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
          projectType.sortOrder
        )}
      </td>

      <td style={tdStyle}>
        <TranslatedText labelKey={projectType.isActive ? "labels.active" : "labels.inactive"} />
      </td>
      <td style={tdStyle}>{projectType.projectCount}</td>

      <td style={tdStyle}>
        {isEditing ? (
          <>
            <form action={handleUpdate} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={projectType.id} />
              <input type="hidden" name="code" value={draft.code} />
              <input type="hidden" name="name" value={draft.name} />
              <input type="hidden" name="nameEs" value={draft.nameEs} />
              <input
                type="hidden"
                name="description"
                value={draft.description}
              />
              <input
                type="hidden"
                name="descriptionEs"
                value={draft.descriptionEs}
              />
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
              <input type="hidden" name="id" value={projectType.id} />
              <input
                type="hidden"
                name="current"
                value={String(projectType.isActive)}
              />
              <button type="submit" style={tableButtonStyle}>
                {<TranslatedButtonLabel labelKey={projectType.isActive ? "actions.deactivate" : "actions.activate"} />}
              </button>
            </form>{" "}
            <form action={handleDelete} style={{ margin: 0, display: "inline" }}>
              <input type="hidden" name="id" value={projectType.id} />
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
