"use client";

import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { useState } from "react";
import Link from "next/link";
import { useActionToast } from "@/components/ui/useActionToast";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import { StandardTable, TableActionGroup } from "@/components/ui/TablePrimitives";
import { thStyle, tdStyle } from "@/components/ui/tableStyles";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import {
  getConfiguredOptions,
  translateConfiguredOption,
  translateProjectHealth,
} from "@/lib/i18n/displayTranslations";

type Project = {
  id: string;
  projectCode: string;
  name: string;
  governedStatusId?: string | null;
  startDate?: string | Date | null;
  healthStatus: string;
  projectType?: { code?: string | null; name: string; nameEs?: string | null } | null;
  governedStatus?: { code?: string | null; name: string; nameEs?: string | null } | null;
  projectManagerContact?: { name: string } | null;
};

type Option = {
  id: string;
  code?: string | null;
  name: string;
  nameEs?: string | null;
};

type OrganizationOption = {
  id: string;
  name: string;
  displayName?: string | null;
  contacts?: ContactOption[];
};

type ContactOption = {
  id: string;
  name: string;
  roleTitle?: string | null;
};

type Props = {
  projects: Project[];
  projectTypes: Option[];
  projectStatusOptions: Option[];
  openProjectStatusIds: string[];
  organizations: OrganizationOption[];
  templates: Option[];
  createProject: (
    formData: FormData
  ) => Promise<{ ok: boolean; message: string } | undefined>;
  deleteProject: (
    formData: FormData
  ) => Promise<{ ok: boolean; message: string } | undefined>;
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  return new Date(value).toISOString().slice(0, 10);
}

export function ProjectsTable({
  projects,
  projectTypes,
  projectStatusOptions,
  openProjectStatusIds,
  organizations,
  templates,
  createProject,
  deleteProject,
}: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();
  const { t, locale } = useTranslation();
  const projectStatusSelectOptions = getConfiguredOptions(
    projectStatusOptions,
    locale,
    t,
    "status"
  );
  const projectTypeSelectOptions = getConfiguredOptions(
    projectTypes,
    locale,
    t,
    "projectType"
  );

  async function handleCreate(formData: FormData) {
    await handleAction(createProject, formData, () => setIsCreating(false));
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteProject, formData);
  }

  const projectManagerContacts = organizations.flatMap((organization) =>
    (organization.contacts ?? []).map((contact) => ({
      ...contact,
      organizationName: organization.displayName || organization.name,
    }))
  );

  return (
    <>
<SectionHeader
  title={<TranslatedText labelKey="pages.projectPortfolio" />}
  action={
    <AddActionButton
      onClick={() => setIsCreating(true)}
      labelKey="actions.addProject"
    />
  }
/>

      <form id="create-project-form" action={handleCreate} />

      <StandardTable>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.code" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.name" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.type" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.template" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.startDate" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.status" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.projectManager" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.health" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.action" /></th>
          </tr>
        </thead>

        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>Auto</td>

              <td style={tdStyle}>
                <input
                  name="name"
                  required
                  placeholder="Project name"
                  style={inputStyle}
                  form="create-project-form"
                  autoComplete="off"
                />
              </td>

              <td style={tdStyle}>
                <select
                  name="projectTypeId"
                  required
                  style={inputStyle}
                  form="create-project-form"
                >
                  <option value="">Select type</option>
                  {projectTypeSelectOptions.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <select
                  name="templateId"
                  style={inputStyle}
                  form="create-project-form"
                >
                  <option value="">No template</option>
                  {(templates ?? []).map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  style={inputStyle}
                  form="create-project-form"
                />
              </td>

             <td style={tdStyle}>
  <select
    name="governedStatusId"
    defaultValue=""
    required
    style={inputStyle}
    form="create-project-form"
  >
    <option value="">Select status</option>
   {projectStatusSelectOptions.map((option) => (
  <option key={`project-status-${option.value}`} value={option.value}>
    {option.label}
  </option>
))}
  </select>
</td>

              <td style={tdStyle}>
                <select
                  name="projectManagerContactId"
                  required
                  style={inputStyle}
                  form="create-project-form"
                >
                  <option value="">Select manager</option>
                  {projectManagerContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                      {contact.roleTitle ? ` - ${contact.roleTitle}` : ""}
                      {contact.organizationName ? ` (${contact.organizationName})` : ""}
                    </option>
                  ))}
                </select>
              </td>

              <td style={tdStyle}>{translateProjectHealth("GREEN", t)}</td>

              <td style={tdStyle}>
                <button
                  type="submit"
                  form="create-project-form"
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

          {projects.map((project) => {
            const canDelete = Boolean(
              project.governedStatusId &&
                openProjectStatusIds.includes(project.governedStatusId)
            );

            return (
              <tr key={project.id}>
              <td style={tdStyle}>{project.projectCode}</td>

              <td style={tdStyle}>
                <Link
                  href={`/projects/${project.id}`}
                  style={{
                    color: "#2563eb",
                    textDecoration: "underline",
                    fontWeight: 600,
                  }}
                >
                  {project.name}
                </Link>
              </td>

              <td style={tdStyle}>
                {translateConfiguredOption(project.projectType, locale, t, "projectType") || "-"}
              </td>
              <td style={tdStyle}>-</td>
              <td style={tdStyle}>{formatDate(project.startDate)}</td>
            <td style={tdStyle}>
              {translateConfiguredOption(project.governedStatus, locale, t, "status") || "-"}
            </td>
              <td style={tdStyle}>
                {project.projectManagerContact?.name ?? "-"}
              </td>
              <td style={tdStyle}>{translateProjectHealth(project.healthStatus, t)}</td>

              <td style={tdStyle}>
                <TableActionGroup>
                  <Link href={`/projects/${project.id}`} style={tableButtonStyle}>
                    <TranslatedButtonLabel labelKey="actions.edit" />
                  </Link>
                {canDelete ? (
                  <form
                    action={handleDelete}
                    style={{ margin: 0, display: "inline" }}
                  >
                    <input type="hidden" name="id" value={project.id} />
                    <button type="submit" style={tableButtonStyle}>
                      <TranslatedButtonLabel labelKey="actions.delete" />
                    </button>
                  </form>
                ) : null}
                </TableActionGroup>
              </td>
            </tr>
            );
          })}
        </tbody>
      </StandardTable>
    </>
  );
}
