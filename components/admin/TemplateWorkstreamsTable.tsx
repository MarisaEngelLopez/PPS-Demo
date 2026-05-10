"use client";

import { useState } from "react";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  buttonStyle,
  inputStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";

type Props = {
  template: any;
  workstreams: any[];
  addTemplateWorkstream: (formData: FormData) => Promise<any>;
  updateTemplateWorkstream: (formData: FormData) => Promise<any>;
  deleteTemplateWorkstream: (formData: FormData) => Promise<any>;
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
      <div style={{ marginBottom: "1rem" }}>
        <button style={buttonStyle} onClick={() => setIsCreating(true)}>
          ➕ Add Workstream
        </button>
      </div>

      <form id="add-template-workstream-form" action={handleAdd} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Phase</th>
            <th style={thStyle}>Workstream</th>
            <th style={thStyle}>Sort Order</th>
            <th style={thStyle}>Start Offset</th>
            <th style={thStyle}>Duration</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>—</td>

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
                <button
                  type="submit"
                  form="add-template-workstream-form"
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

          {template.templateWorkstreams.map((tw: any) => (
            <TemplateWorkstreamRow
              key={tw.id}
              tw={tw}
              templateId={template.id}
              updateTemplateWorkstream={handleUpdate}
              deleteTemplateWorkstream={handleDelete}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}

function TemplateWorkstreamRow({
  tw,
  templateId,
  updateTemplateWorkstream,
  deleteTemplateWorkstream,
}: any) {
  const [sortOrder, setSortOrder] = useState(tw.sortOrder ?? 100);
  const [plannedOffsetDays, setPlannedOffsetDays] = useState(
    tw.plannedOffsetDays ?? 0
  );
  const [durationDays, setDurationDays] = useState(tw.durationDays ?? 5);

  return (
    <tr>
      <td style={tdStyle}>{tw.workstream?.phase?.name ?? "-"}</td>
      <td style={tdStyle}>{tw.workstream?.name ?? "-"}</td>

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

      <td style={tdStyle}>
        <form
          action={updateTemplateWorkstream}
          style={{ margin: 0, display: "inline" }}
        >
          <input type="hidden" name="id" value={tw.id} />
          <input type="hidden" name="templateId" value={templateId} />
          <input type="hidden" name="sortOrder" value={sortOrder} />
          <input
            type="hidden"
            name="plannedOffsetDays"
            value={plannedOffsetDays}
          />
          <input type="hidden" name="durationDays" value={durationDays} />

          <button type="submit" style={tableButtonStyle}>
            Save
          </button>
        </form>{" "}

        <form
          action={deleteTemplateWorkstream}
          style={{ margin: 0, display: "inline" }}
        >
          <input type="hidden" name="id" value={tw.id} />
          <input type="hidden" name="templateId" value={templateId} />

          <button type="submit" style={tableButtonStyle}>
            Delete
          </button>
        </form>
      </td>
    </tr>
  );
}