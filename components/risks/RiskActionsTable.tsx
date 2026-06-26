"use client";

import { useState } from "react";
import { tableButtonStyle } from "@/components/ui/layoutStyles";
import { DateInput, SelectInput, TextInput } from "@/components/ui/FormFields";
import {
  StandardTable,
  TableActionGroup,
  TableEmptyRow,
} from "@/components/ui/TablePrimitives";
import { tdStyle, thStyle } from "@/components/ui/tableStyles";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { NestedTablePanel } from "@/components/ui/NestedTablePanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  TranslatedButtonLabel,
  TranslatedText,
} from "@/components/ui/TranslatedControls";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import {
  canDeleteRiskActionByStatusCode,
  RISK_ACTION_EVIDENCE_ENTITY,
  RISK_ACTION_ENTITY,
} from "@/lib/domain/risks/riskContract";
import type { RiskActionResult } from "@/lib/domain/risks/riskTypes";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { getConfiguredOptions } from "@/lib/i18n/displayTranslations";

type RiskCommand = (formData: FormData) => Promise<RiskActionResult | void>;

const riskActionColumnLabelKeys: Record<string, TranslationKey> = {
  Action: "labels.action",
  Code: "labels.code",
  "Completion Criteria": "labels.completionCriteria",
  "Due Date": "labels.dueDate",
  Evidence: "labels.evidence",
  "Evidence / Comment": "labels.evidence",
  Owner: "labels.owner",
  Status: "labels.status",
};

const riskEvidenceColumnLabelKeys: Record<string, TranslationKey> = {
  Action: "labels.action",
  Date: "table.date",
  Reference: "labels.reference",
  Title: "labels.title",
  Type: "labels.type",
  Uploaded: "labels.uploadedBy",
  "Uploaded By": "labels.uploadedBy",
  URL: "labels.url",
};

type UserOption = {
  id: string;
  fullName: string;
};

type StatusOption = {
  id: string;
  code: string;
  name: string;
  nameEs?: string | null;
};

type EvidenceTypeOption = {
  id: string;
  code: string;
  name: string;
  nameEs?: string | null;
};

type RiskActionEvidenceRowData = {
  id: string;
  riskActionId: string;
  evidenceTypeId: string;
  title: string;
  description: string | null;
  documentReference: string | null;
  url: string | null;
  evidenceDate: Date | string | null;
  uploadedBy: string | null;
  evidenceType?: { code: string; name: string; nameEs?: string | null } | null;
};

type RiskActionRowData = {
  id: string;
  actionCode: string | null;
  description: string;
  completionCriteria: string | null;
  ownerId: string | null;
  dueDate: Date | string | null;
  statusRef?: { code: string; name: string; nameEs?: string | null } | null;
  evidence: string | null;
  evidenceRecords: RiskActionEvidenceRowData[];
};

type RiskForActions = {
  id: string;
  riskActions?: RiskActionRowData[];
};

type RiskActionsTableProps = {
  risk: RiskForActions;
  users: UserOption[];
  riskActionStatuses: StatusOption[];
  evidenceTypes: EvidenceTypeOption[];
  createProjectRiskAction: RiskCommand;
  updateProjectRiskAction: RiskCommand;
  deleteProjectRiskAction: RiskCommand;
  createRiskActionEvidence: RiskCommand;
  updateRiskActionEvidence: RiskCommand;
  deleteRiskActionEvidence: RiskCommand;
};

type RiskActionRowProps = {
  action: RiskActionRowData;
  users: UserOption[];
  riskActionStatuses: StatusOption[];
  evidenceTypes: EvidenceTypeOption[];
  updateProjectRiskAction: RiskCommand;
  deleteProjectRiskAction: RiskCommand;
  createRiskActionEvidence: RiskCommand;
  updateRiskActionEvidence: RiskCommand;
  deleteRiskActionEvidence: RiskCommand;
};

function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function RiskActionsTable({
  risk,
  users,
  riskActionStatuses,
  evidenceTypes,
  createProjectRiskAction,
  updateProjectRiskAction,
  deleteProjectRiskAction,
  createRiskActionEvidence,
  updateRiskActionEvidence,
  deleteRiskActionEvidence,
}: RiskActionsTableProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { t, locale } = useTranslation();
  const createFormId = `create-risk-action-${risk.id}`;
  const safeRiskActionStatuses = riskActionStatuses ?? [];
  const ownerOptions = users.map((user) => ({
    value: user.id,
    label: user.fullName,
  }));
  const statusOptions = safeRiskActionStatuses.map((status) => ({
    value: status.code,
    label: getConfiguredOptions([status], locale, t, "status")[0]?.label ?? status.name,
  }));

  async function handleCreate(formData: FormData) {
    await createProjectRiskAction(formData);
    setIsCreating(false);
  }

  return (
    <NestedTablePanel>
      <SectionHeader
        title={<TranslatedText labelKey="sections.mitigationActions" />}
        action={
          <AddActionButton type="button" onClick={() => setIsCreating(true)}>
            {RISK_ACTION_ENTITY.createLabel}
          </AddActionButton>
        }
      />

      <form id={createFormId} action={handleCreate} />

      <div style={{ maxWidth: "100%" }}>
        <StandardTable style={{ marginTop: "0.5rem" }}>
          <thead>
            <tr>
              {RISK_ACTION_ENTITY.tableColumns.map((column, index) => (
                <th key={`${column}-${index}`} style={thStyle}>
                  {riskActionColumnLabelKeys[column] ? (
                    <TranslatedText labelKey={riskActionColumnLabelKeys[column]} />
                  ) : (
                    column
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isCreating && (
              <tr>
                <td style={tdStyle}>{RISK_ACTION_ENTITY.autoCodeLabel}</td>
                <td style={tdStyle}>
                  <TextInput
                    name="description"
                    required
                    placeholder={RISK_ACTION_ENTITY.fields.actionPlaceholder}
                    form={createFormId}
                  />
                  <input
                    type="hidden"
                    name="projectRiskId"
                    value={risk.id}
                    form={createFormId}
                  />
                </td>

                <td style={tdStyle}>
                  <TextInput
                    name="completionCriteria"
                    placeholder={RISK_ACTION_ENTITY.fields.completionCriteriaPlaceholder}
                    form={createFormId}
                  />
                </td>

                <td style={tdStyle}>
                  <SelectInput
                    name="ownerId"
                    form={createFormId}
                    placeholder={RISK_ACTION_ENTITY.fields.noOwner}
                    options={ownerOptions}
                  />
                </td>

                <td style={tdStyle}>
                  <DateInput
                    name="dueDate"
                    form={createFormId}
                  />
                </td>

                <td style={tdStyle}>
                  <SelectInput
                    name="status"
                    defaultValue={RISK_ACTION_ENTITY.defaultStatusCode}
                    form={createFormId}
                    options={statusOptions}
                  />
                </td>

                <td style={tdStyle}>
                  <TextInput
                    name="evidence"
                    placeholder={RISK_ACTION_ENTITY.fields.evidencePlaceholder}
                    form={createFormId}
                  />
                </td>

                <td style={tdStyle}>-</td>

                <td style={tdStyle}>
                  <button type="submit" form={createFormId} style={tableButtonStyle}>
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

            {(risk.riskActions || []).map((action) => (
              <RiskActionRow
                key={action.id}
                action={action}
                users={users}
                riskActionStatuses={riskActionStatuses}
                evidenceTypes={evidenceTypes}
                updateProjectRiskAction={updateProjectRiskAction}
                deleteProjectRiskAction={deleteProjectRiskAction}
                createRiskActionEvidence={createRiskActionEvidence}
                updateRiskActionEvidence={updateRiskActionEvidence}
                deleteRiskActionEvidence={deleteRiskActionEvidence}
              />
            ))}

            {(risk.riskActions || []).length === 0 && !isCreating && (
              <TableEmptyRow colSpan={9}>{RISK_ACTION_ENTITY.emptyLabel}</TableEmptyRow>
            )}
          </tbody>
        </StandardTable>
      </div>
    </NestedTablePanel>
  );
}

function RiskActionRow({
  action,
  users,
  riskActionStatuses,
  evidenceTypes,
  updateProjectRiskAction,
  deleteProjectRiskAction,
  createRiskActionEvidence,
  updateRiskActionEvidence,
  deleteRiskActionEvidence,
}: RiskActionRowProps) {
  const formId = `risk-action-form-${action.id}`;
  const { t, locale } = useTranslation();

  const [showEvidence, setShowEvidence] = useState(false);
  const [description, setDescription] = useState(action.description ?? "");
  const [completionCriteria, setCompletionCriteria] = useState(
    action.completionCriteria ?? ""
  );
  const [ownerId, setOwnerId] = useState(action.ownerId ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(action.dueDate));
  const [status, setStatus] = useState(
    action.statusRef?.code ?? RISK_ACTION_ENTITY.defaultStatusCode
  );
  const [evidence, setEvidence] = useState(action.evidence ?? "");
  const ownerOptions = users.map((user) => ({
    value: user.id,
    label: user.fullName,
  }));
  const statusOptions = riskActionStatuses.map((statusOption) => ({
    value: statusOption.code,
    label: getConfiguredOptions([statusOption], locale, t, "status")[0]?.label ?? statusOption.name,
  }));
  const evidenceCount = action.evidenceRecords?.length ?? 0;

  async function handleUpdate(formData: FormData) {
    await updateProjectRiskAction(formData);
  }

  async function handleDelete(formData: FormData) {
    await deleteProjectRiskAction(formData);
  }

  return (
    <>
    <tr id={`risk-action-${action.id}`}>
      <td style={tdStyle}>{action.actionCode ?? "-"}</td>
      <td style={tdStyle}>
        <TextInput
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </td>
      <td style={tdStyle}>
        <TextInput
          value={completionCriteria}
          onChange={(event) => setCompletionCriteria(event.target.value)}
        />
      </td>
      <td style={tdStyle}>
        <SelectInput
          value={ownerId}
          onChange={(event) => setOwnerId(event.target.value)}
          placeholder={RISK_ACTION_ENTITY.fields.noOwner}
          options={ownerOptions}
        />
      </td>
      <td style={tdStyle}>
        <DateInput
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </td>
      <td style={tdStyle}>
        <SelectInput
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={statusOptions}
        />
      </td>
      <td style={tdStyle}>
        <TextInput
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
        />
      </td>
      <td style={tdStyle}>
        <button
          type="button"
          style={tableButtonStyle}
          onClick={() => setShowEvidence(!showEvidence)}
        >
          {showEvidence
            ? <TranslatedButtonLabel labelKey="actions.hideEvidence" />
            : <TranslatedButtonLabel labelKey="actions.evidence" />}
          {evidenceCount > 0 ? ` ${evidenceCount}` : ""}
        </button>
      </td>
      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
        <TableActionGroup>
          <form id={formId} action={handleUpdate} style={{ margin: 0 }}>
            <input type="hidden" name="id" value={action.id} />
            <input type="hidden" name="description" value={description} />
            <input
              type="hidden"
              name="completionCriteria"
              value={completionCriteria}
            />
            <input type="hidden" name="ownerId" value={ownerId} />
            <input type="hidden" name="dueDate" value={dueDate} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="evidence" value={evidence} />

            <button type="submit" style={tableButtonStyle}>
              <TranslatedButtonLabel labelKey="actions.save" />
            </button>
          </form>

          {canDeleteRiskActionByStatusCode(status) && (
            <form action={handleDelete} style={{ margin: 0 }}>
              <input type="hidden" name="id" value={action.id} />
              <button type="submit" style={tableButtonStyle}>
                <TranslatedButtonLabel labelKey="actions.delete" />
              </button>
            </form>
          )}
        </TableActionGroup>
      </td>
    </tr>
    {showEvidence && (
      <tr>
        <td style={tdStyle} colSpan={9}>
          <RiskActionEvidenceTable
            action={action}
            evidenceTypes={evidenceTypes}
            createRiskActionEvidence={createRiskActionEvidence}
            updateRiskActionEvidence={updateRiskActionEvidence}
            deleteRiskActionEvidence={deleteRiskActionEvidence}
          />
        </td>
      </tr>
    )}
    </>
  );
}

type RiskActionEvidenceTableProps = {
  action: RiskActionRowData;
  evidenceTypes: EvidenceTypeOption[];
  createRiskActionEvidence: RiskCommand;
  updateRiskActionEvidence: RiskCommand;
  deleteRiskActionEvidence: RiskCommand;
};

type RiskActionEvidenceRowProps = {
  evidence: RiskActionEvidenceRowData;
  evidenceTypes: EvidenceTypeOption[];
  updateRiskActionEvidence: RiskCommand;
  deleteRiskActionEvidence: RiskCommand;
};

function RiskActionEvidenceTable({
  action,
  evidenceTypes,
  createRiskActionEvidence,
  updateRiskActionEvidence,
  deleteRiskActionEvidence,
}: RiskActionEvidenceTableProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { t, locale } = useTranslation();
  const formId = `risk-action-evidence-create-${action.id}`;
  const evidenceTypeOptions = getConfiguredOptions(
    evidenceTypes,
    locale,
    t,
    "evidenceType"
  );

  async function handleCreate(formData: FormData) {
    await createRiskActionEvidence(formData);
    setIsCreating(false);
  }

  return (
    <NestedTablePanel>
      <SectionHeader
        title={<TranslatedText labelKey="sections.evidenceRecords" />}
        action={
          <AddActionButton type="button" onClick={() => setIsCreating(true)}>
            {RISK_ACTION_EVIDENCE_ENTITY.createLabel}
          </AddActionButton>
        }
      />

      <form id={formId} action={handleCreate} />

      <StandardTable style={{ marginTop: "0.5rem" }}>
        <thead>
          <tr>
            {RISK_ACTION_EVIDENCE_ENTITY.tableColumns.map((column) => (
              <th key={column} style={thStyle}>
                {riskEvidenceColumnLabelKeys[column] ? (
                  <TranslatedText labelKey={riskEvidenceColumnLabelKeys[column]} />
                ) : (
                  column
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>
                <SelectInput
                  name="evidenceTypeId"
                  required
                  form={formId}
                  placeholder={RISK_ACTION_EVIDENCE_ENTITY.fields.typePlaceholder}
                  options={evidenceTypeOptions}
                />
                <input
                  type="hidden"
                  name="riskActionId"
                  value={action.id}
                  form={formId}
                />
              </td>
              <td style={tdStyle}>
                <TextInput
                  name="title"
                  required
                  form={formId}
                  placeholder={RISK_ACTION_EVIDENCE_ENTITY.fields.titlePlaceholder}
                />
              </td>
              <td style={tdStyle}>
                <DateInput name="evidenceDate" form={formId} />
              </td>
              <td style={tdStyle}>
                <TextInput
                  name="documentReference"
                  form={formId}
                  placeholder={RISK_ACTION_EVIDENCE_ENTITY.fields.referencePlaceholder}
                />
              </td>
              <td style={tdStyle}>
                <TextInput
                  name="url"
                  form={formId}
                  placeholder={RISK_ACTION_EVIDENCE_ENTITY.fields.urlPlaceholder}
                />
              </td>
              <td style={tdStyle}>
                <TextInput
                  name="uploadedBy"
                  form={formId}
                  placeholder={RISK_ACTION_EVIDENCE_ENTITY.fields.uploadedByPlaceholder}
                />
              </td>
              <td style={tdStyle}>
                <button type="submit" form={formId} style={tableButtonStyle}>
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

          {(action.evidenceRecords ?? []).map((evidence) => (
            <RiskActionEvidenceRow
              key={evidence.id}
              evidence={evidence}
              evidenceTypes={evidenceTypes}
              updateRiskActionEvidence={updateRiskActionEvidence}
              deleteRiskActionEvidence={deleteRiskActionEvidence}
            />
          ))}

          {(action.evidenceRecords ?? []).length === 0 && !isCreating && (
            <TableEmptyRow colSpan={7}>
              {RISK_ACTION_EVIDENCE_ENTITY.emptyLabel}
            </TableEmptyRow>
          )}
        </tbody>
      </StandardTable>
    </NestedTablePanel>
  );
}

function RiskActionEvidenceRow({
  evidence,
  evidenceTypes,
  updateRiskActionEvidence,
  deleteRiskActionEvidence,
}: RiskActionEvidenceRowProps) {
  const formId = `risk-action-evidence-form-${evidence.id}`;
  const { t, locale } = useTranslation();
  const [evidenceTypeId, setEvidenceTypeId] = useState(
    evidence.evidenceTypeId ?? ""
  );
  const [title, setTitle] = useState(evidence.title ?? "");
  const [evidenceDate, setEvidenceDate] = useState(
    toDateInputValue(evidence.evidenceDate)
  );
  const [documentReference, setDocumentReference] = useState(
    evidence.documentReference ?? ""
  );
  const [url, setUrl] = useState(evidence.url ?? "");
  const [uploadedBy, setUploadedBy] = useState(evidence.uploadedBy ?? "");
  const evidenceTypeOptions = getConfiguredOptions(
    evidenceTypes,
    locale,
    t,
    "evidenceType"
  );

  async function handleUpdate(formData: FormData) {
    await updateRiskActionEvidence(formData);
  }

  async function handleDelete(formData: FormData) {
    await deleteRiskActionEvidence(formData);
  }

  return (
    <tr>
      <td style={tdStyle}>
        <SelectInput
          value={evidenceTypeId}
          onChange={(event) => setEvidenceTypeId(event.target.value)}
          options={evidenceTypeOptions}
        />
      </td>
      <td style={tdStyle}>
        <TextInput
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </td>
      <td style={tdStyle}>
        <DateInput
          value={evidenceDate}
          onChange={(event) => setEvidenceDate(event.target.value)}
        />
      </td>
      <td style={tdStyle}>
        <TextInput
          value={documentReference}
          onChange={(event) => setDocumentReference(event.target.value)}
        />
      </td>
      <td style={tdStyle}>
        <TextInput value={url} onChange={(event) => setUrl(event.target.value)} />
      </td>
      <td style={tdStyle}>
        <TextInput
          value={uploadedBy}
          onChange={(event) => setUploadedBy(event.target.value)}
        />
      </td>
      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
        <TableActionGroup>
          <form id={formId} action={handleUpdate} style={{ margin: 0 }}>
            <input type="hidden" name="id" value={evidence.id} />
            <input
              type="hidden"
              name="riskActionId"
              value={evidence.riskActionId ?? ""}
            />
            <input type="hidden" name="evidenceTypeId" value={evidenceTypeId} />
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="evidenceDate" value={evidenceDate} />
            <input
              type="hidden"
              name="documentReference"
              value={documentReference}
            />
            <input type="hidden" name="url" value={url} />
            <input type="hidden" name="uploadedBy" value={uploadedBy} />
            <button type="submit" style={tableButtonStyle}>
              <TranslatedButtonLabel labelKey="actions.save" />
            </button>
          </form>

          <form action={handleDelete} style={{ margin: 0 }}>
            <input type="hidden" name="id" value={evidence.id} />
            <button type="submit" style={tableButtonStyle}>
              <TranslatedButtonLabel labelKey="actions.delete" />
            </button>
          </form>
        </TableActionGroup>
      </td>
    </tr>
  );
}
