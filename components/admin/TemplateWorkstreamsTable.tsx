"use client";

import { TranslatedButtonLabel, TranslatedText } from "@/components/ui/TranslatedControls";
import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { NestedTablePanel } from "@/components/ui/NestedTablePanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { inputStyle, tableButtonStyle } from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import type {
  ProjectTemplateDetail,
  TemplateWorkstreamActionResult,
  TemplateWorkstreamOption,
  TemplateWorkstreamRow as TemplateWorkstreamRowData,
} from "@/lib/domain/projectTemplates/projectTemplateTypes";

type ActionHandler = (
  formData: FormData
) => Promise<TemplateWorkstreamActionResult | undefined>;
type ClientActionHandler = (formData: FormData) => Promise<void>;

type Props = {
  template: ProjectTemplateDetail;
  workstreams: TemplateWorkstreamOption[];
  addTemplateWorkstream: ActionHandler;
  updateTemplateWorkstream: ActionHandler;
  deleteTemplateWorkstream: ActionHandler;
};

export function TemplateWorkstreamsTable({
  template,
  workstreams,
  addTemplateWorkstream,
  updateTemplateWorkstream,
  deleteTemplateWorkstream,
}: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const { handleAction } = useActionToast();

  async function handleAdd(formData: FormData) {
    await handleAction(addTemplateWorkstream, formData, () =>
      setIsCreating(false)
    );
  }

  async function handleUpdate(formData: FormData) {
    await handleAction(updateTemplateWorkstream, formData);
  }

  async function handleDelete(formData: FormData) {
    await handleAction(deleteTemplateWorkstream, formData);
  }

  return (
    <>
      <SectionHeader
        title={<TranslatedText labelKey="labels.workstreams" />}
        action={
          <AddActionButton onClick={() => setIsCreating(true)}>
            <TranslatedText labelKey="workstreams.add" />
          </AddActionButton>
        }
      />

      <form id="add-template-workstream-form" action={handleAdd} />

      <NestedTablePanel>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}><TranslatedText labelKey="labels.phase" /></th>
              <th style={thStyle}><TranslatedText labelKey="labels.workstream" /></th>
              <th style={thStyle}><TranslatedText labelKey="labels.sort" /></th>
              <th style={thStyle}><TranslatedText labelKey="labels.startOffsetDays" /></th>
              <th style={thStyle}><TranslatedText labelKey="labels.durationDays" /></th>
              <th style={thStyle}><TranslatedText labelKey="labels.actions" /></th>
            </tr>
          </thead>

          <tbody>
            {isCreating && (
              <tr>
                <td style={tdStyle}>-</td>

                <td style={tdStyle}>
                  <input
                    type="hidden"
                    name="templateId"
                    value={template.id}
                    form="add-template-workstream-form"
                  />

                  <select
                    name="workstreamId"
                    required
                    style={inputStyle}
                    form="add-template-workstream-form"
                  >
                    <option value="">Select workstream</option>
                    {workstreams.map((workstream) => (
                      <option key={workstream.id} value={workstream.id}>
                        {workstream.phase?.name
                          ? `${workstream.phase.name} - ${workstream.name}`
                          : workstream.name}
                      </option>
                    ))}
                  </select>
                </td>

                <td style={tdStyle}>
                  <input
                    type="number"
                    name="sortOrder"
                    defaultValue={100}
                    style={inputStyle}
                    form="add-template-workstream-form"
                  />
                </td>

                <td style={tdStyle}>
                  <input
                    type="number"
                    name="plannedOffsetDays"
                    defaultValue={0}
                    style={inputStyle}
                    form="add-template-workstream-form"
                  />
                </td>

                <td style={tdStyle}>
                  <input
                    type="number"
                    name="durationDays"
                    defaultValue={5}
                    style={inputStyle}
                    form="add-template-workstream-form"
                  />
                </td>

                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      type="submit"
                      form="add-template-workstream-form"
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

            {template.templateWorkstreams.map((templateWorkstream) => (
              <TemplateWorkstreamRow
                key={templateWorkstream.id}
                templateWorkstream={templateWorkstream}
                templateId={template.id}
                updateTemplateWorkstream={handleUpdate}
                deleteTemplateWorkstream={handleDelete}
              />
            ))}

            {template.templateWorkstreams.length === 0 && !isCreating && (
              <tr>
                <td style={tdStyle} colSpan={6}>
                  No workstreams configured for this template.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </NestedTablePanel>
    </>
  );
}

function TemplateWorkstreamRow({
  templateWorkstream,
  templateId,
  updateTemplateWorkstream,
  deleteTemplateWorkstream,
}: {
  templateWorkstream: TemplateWorkstreamRowData;
  templateId: string;
  updateTemplateWorkstream: ClientActionHandler;
  deleteTemplateWorkstream: ClientActionHandler;
}) {
  const [sortOrder, setSortOrder] = useState(
    templateWorkstream.sortOrder ?? 100
  );
  const [plannedOffsetDays, setPlannedOffsetDays] = useState(
    templateWorkstream.plannedOffsetDays ?? 0
  );
  const [durationDays, setDurationDays] = useState(
    templateWorkstream.durationDays ?? 5
  );

  return (
    <tr>
      <td style={tdStyle}>{templateWorkstream.workstream?.phase?.name ?? "-"}</td>
      <td style={tdStyle}>{templateWorkstream.workstream?.name ?? "-"}</td>

      <td style={tdStyle}>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          style={inputStyle}
        />
      </td>

      <td style={tdStyle}>
        <input
          type="number"
          value={plannedOffsetDays}
          onChange={(e) => setPlannedOffsetDays(Number(e.target.value))}
          style={inputStyle}
        />
      </td>

      <td style={tdStyle}>
        <input
          type="number"
          value={durationDays}
          onChange={(e) => setDurationDays(Number(e.target.value))}
          style={inputStyle}
        />
      </td>

      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", gap: "0.25rem" }}>
        <form
          action={updateTemplateWorkstream}
          style={{ margin: 0, display: "inline" }}
        >
          <input type="hidden" name="id" value={templateWorkstream.id} />
          <input type="hidden" name="templateId" value={templateId} />
          <input type="hidden" name="sortOrder" value={sortOrder} />
          <input
            type="hidden"
            name="plannedOffsetDays"
            value={plannedOffsetDays}
          />
          <input type="hidden" name="durationDays" value={durationDays} />

          <button type="submit" style={tableButtonStyle}>
            <TranslatedButtonLabel labelKey="actions.save" />
          </button>
        </form>

        <form
          action={deleteTemplateWorkstream}
          style={{ margin: 0, display: "inline" }}
        >
          <input type="hidden" name="id" value={templateWorkstream.id} />
          <input type="hidden" name="templateId" value={templateId} />

          <button type="submit" style={tableButtonStyle}>
            <TranslatedButtonLabel labelKey="actions.delete" />
          </button>
        </form>
        </div>
      </td>
    </tr>
  );
}
