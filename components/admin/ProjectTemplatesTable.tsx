"use client";

import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { useState } from "react";
import Link from "next/link";
import { useActionToast } from "@/components/ui/useActionToast";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import type {
  ProjectTemplateActionResult,
  ProjectTemplateAdminRow,
} from "@/lib/domain/projectTemplates/projectTemplateTypes";

type ActionHandler = (
  formData: FormData
) => Promise<ProjectTemplateActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

type Props = {
  templates: ProjectTemplateAdminRow[];
  createProjectTemplate: ActionHandler;
  updateProjectTemplate: ActionHandler;
  toggleProjectTemplate: ActionHandler;
  deleteProjectTemplate: ActionHandler;
};

export function ProjectTemplatesTable({
  templates,
  createProjectTemplate,
  updateProjectTemplate,
  toggleProjectTemplate,
  deleteProjectTemplate,
}: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleCreate(formData: FormData) {
    await handleAction(createProjectTemplate, formData, () =>
      setIsCreating(false)
    );
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updateProjectTemplate, formData);
  }

  async function handleToggle(formData: FormData) {
    await handleAction(toggleProjectTemplate, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteProjectTemplate, formData);
  }

  return (
    <>
      <SectionHeader
        title={<TranslatedText labelKey="labels.templates" />}
        action={
          <AddActionButton onClick={() => setIsCreating(true)}>
            <TranslatedText labelKey="actions.newTemplate" />
          </AddActionButton>
        }
      />

      <form id="create-template-form" action={handleCreate} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.code" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.name" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.workstreams" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.active" /></th>
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
                  placeholder="IT_IMPL"
                  style={inputStyle}
                  form="create-template-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <input
                  name="name"
                  required
                  placeholder="Standard IT Implementation"
                  style={inputStyle}
                  form="create-template-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>0</td>
              <td style={tdStyle}><TranslatedText labelKey="labels.new" /></td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-template-form"
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

          {templates.map((template) => (
            <ProjectTemplateRow
              key={template.id}
              template={template}
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

function ProjectTemplateRow({
  template,
  handleUpdate,
  handleToggle,
  handleDelete,
}: {
  template: ProjectTemplateAdminRow;
  handleUpdate: ClientActionHandler;
  handleToggle: ClientActionHandler;
  handleDelete: ClientActionHandler;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    code: template.code ?? "",
    name: template.name ?? "",
  });

  function resetDraft() {
    setDraft({
      code: template.code ?? "",
      name: template.name ?? "",
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
          template.code
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
          <Link
            href={`/admin/project-templates/${template.id}`}
            style={{
              color: "#2563eb",
              textDecoration: "underline",
              fontWeight: 600,
            }}
          >
            {template.name}
          </Link>
        )}
      </td>

      <td style={tdStyle}>{template.workstreamCount}</td>
      <td style={tdStyle}>{template.isActive ? "Active" : "Inactive"}</td>

      <td style={tdStyle}>
        {isEditing ? (
          <>
            <form action={handleUpdate} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={template.id} />
              <input type="hidden" name="code" value={draft.code} />
              <input type="hidden" name="name" value={draft.name} />
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
              <input type="hidden" name="id" value={template.id} />
              <input
                type="hidden"
                name="current"
                value={String(template.isActive)}
              />
              <button type="submit" style={tableButtonStyle}>
                {<TranslatedButtonLabel labelKey={template.isActive ? "actions.deactivate" : "actions.activate"} />}
              </button>
            </form>{" "}
            {!template.isActive && template.workstreamCount === 0 && (
              <>
                {" "}
                <form action={handleDelete} style={{ margin: 0, display: "inline" }}>
                  <input type="hidden" name="id" value={template.id} />
                  <button type="submit" style={tableButtonStyle}>
                    <TranslatedButtonLabel labelKey="actions.delete" />
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </td>
    </tr>
  );
}
