"use client";

import { useState, type FormEvent } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import {
  TranslatedButtonLabel,
  TranslatedText,
} from "@/components/ui/TranslatedControls";
import { useActionToast } from "@/components/ui/useActionToast";
import {
  tableButtonStyle,
  sectionPanelStyle,
  sectionActionButtonStyle,
} from "@/components/ui/layoutStyles";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CockpitMetricGrid } from "@/components/executive-report/CockpitMetricGrid";
import {
  CheckboxFilterField,
  DateInput,
  DetailField,
  FilterField,
  FilterSelectInput,
  FilterTextInput,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/ui/FormFields";
import {
  StandardTable,
  TableActionGroup,
  TableEmptyRow,
} from "@/components/ui/TablePrimitives";
import { thStyle, tdStyle } from "@/components/ui/tableStyles";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import {
  getConfiguredOptions,
  getDecisionImpactOptions,
  getVisibilityOptions,
} from "@/lib/i18n/displayTranslations";
import {
  canDeleteDecisionByStatusCode,
  buildDecisionCockpitMetrics,
  DECISION_ENTITY,
  getDefaultDecisionStatusCode,
} from "@/lib/domain/decisions/decisionContract";
import type {
  DecisionActionResult,
  DecisionFilters,
  DecisionMetrics,
  DecisionStatusOption,
} from "@/lib/domain/decisions/decisionTypes";

type ProjectOption = {
  id: string;
  projectCode: string;
  name: string;
};

type ProjectWorkstreamOption = {
  id: string;
  projectId: string;
  workstream: {
    name: string;
    phase: {
      name: string;
    };
  };
};

type DecisionRowData = {
  id: string;
  projectId: string;
  projectWorkstreamId: string | null;
  decisionCode: string | null;
  title: string;
  statusRef: { code: string; name: string; nameEs?: string | null };
  impact: string;
  owner: string | null;
  dueDate: Date | string | null;
  decisionDate: Date | string | null;
  escalated: boolean;
  visibility: string;
  requestedBy: string | null;
  description: string | null;
  recommendation: string | null;
  decision: string | null;
  notes: string | null;
};

type DecisionAction = (formData: FormData) => Promise<DecisionActionResult>;

const decisionColumnLabelKeys: Record<string, TranslationKey> = {
  Action: "labels.action",
  Code: "labels.code",
  "Esc.": "labels.esc",
  Impact: "labels.impact",
  Owner: "labels.owner",
  Project: "labels.project",
  Status: "labels.status",
  Title: "labels.title",
  Workstream: "labels.workstream",
};

type DecisionsTableProps = {
  projects: ProjectOption[];
  projectWorkstreams: ProjectWorkstreamOption[];
  decisions: DecisionRowData[];
  decisionStatusOptions: DecisionStatusOption[];
  filters: DecisionFilters;
  metrics: DecisionMetrics;
  createDecision: DecisionAction;
  updateDecision: DecisionAction;
  archiveDecision: DecisionAction;
  deleteDecision: DecisionAction;
};

type CreateDecisionRowProps = {
  projects: ProjectOption[];
  projectWorkstreams: ProjectWorkstreamOption[];
  decisionStatusOptions: DecisionStatusOption[];
  defaultDecisionStatus: string;
  createDecision: DecisionAction;
  onCancel: () => void;
};

type DecisionRowProps = {
  decision: DecisionRowData;
  projects: ProjectOption[];
  projectWorkstreams: ProjectWorkstreamOption[];
  decisionStatusOptions: DecisionStatusOption[];
  updateDecision: DecisionAction;
  archiveDecision: DecisionAction;
  deleteDecision: DecisionAction;
};

function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function DecisionsTable({
  projects,
  projectWorkstreams,
  decisions,
  decisionStatusOptions,
  filters,
  metrics,
  createDecision,
  updateDecision,
  archiveDecision,
  deleteDecision,
}: DecisionsTableProps) {
  const [isCreating, setIsCreating] = useState(false);
const safeDecisions = decisions ?? [];
const defaultDecisionStatus = getDefaultDecisionStatusCode(decisionStatusOptions);
const projectOptions = projects.map((project) => ({
  value: project.id,
  label: `${project.projectCode} - ${project.name}`,
}));
const { t, locale } = useTranslation();
const statusOptions = decisionStatusOptions.map((option) => ({
  value: option.status.code,
  label:
    getConfiguredOptions([option.status], locale, t, "status")[0]?.label ??
    option.status.name,
}));
const impactOptions = getDecisionImpactOptions(t);


  return (
    <>
      <CockpitMetricGrid metrics={buildDecisionCockpitMetrics(metrics)} />

      <form
        method="get"
        style={{
          ...sectionPanelStyle,
          background: "#f8fafc",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "end",
          marginBottom: "0.75rem",
        }}
      >
        <FilterField label={<TranslatedText labelKey="labels.project" />}>
          <FilterSelectInput
            name="projectId"
            defaultValue={filters?.projectId ?? ""}
            placeholder={t("filters.allProjects")}
            options={projectOptions}
          />
        </FilterField>

        <FilterField label={<TranslatedText labelKey="labels.status" />}>
          <FilterSelectInput
            name="status"
            defaultValue={filters?.status ?? ""}
            placeholder={t("filters.allStatuses")}
            options={statusOptions}
          />
        </FilterField>

        <FilterField label={<TranslatedText labelKey="labels.impact" />}>
          <FilterSelectInput
            name="impact"
            defaultValue={filters?.impact ?? ""}
            placeholder={t("filters.allImpacts")}
            options={impactOptions}
          />
        </FilterField>

        <FilterField label={<TranslatedText labelKey="labels.owner" />}>
          <FilterTextInput
            name="owner"
            defaultValue={filters?.owner ?? ""}
            placeholder={DECISION_ENTITY.filters.ownerPlaceholder}
          />
        </FilterField>

        <CheckboxFilterField
          name="escalated"
          label={<TranslatedText labelKey="filters.escalatedOnly" />}
          defaultChecked={filters?.escalated}
        />

        <CheckboxFilterField
          name="overdueOnly"
          label={<TranslatedText labelKey="filters.overdueOnly" />}
          defaultChecked={filters?.overdueOnly}
        />

        <CheckboxFilterField
          name="openOnly"
          label={<TranslatedText labelKey="filters.openOnly" />}
          defaultChecked={filters?.openOnly}
        />

        <div style={{ marginLeft: "auto", display: "flex", gap: "0.35rem" }}>
          <button type="submit" style={sectionActionButtonStyle}>
            <TranslatedText labelKey="filters.apply" />
          </button>

          <a
            href={DECISION_ENTITY.route}
            style={{
              ...sectionActionButtonStyle,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            <TranslatedText labelKey="filters.clear" />
          </a>
        </div>
      </form>

      <SectionHeader
        title={<TranslatedText labelKey="sections.decisionList" />}
        action={
          <AddActionButton type="button" onClick={() => setIsCreating(true)}>
            {DECISION_ENTITY.createLabel}
          </AddActionButton>
        }
      />

      <StandardTable>
        <thead>
          <tr>
            {DECISION_ENTITY.tableColumns.map((column) => (
              <th key={column} style={thStyle}>
                {decisionColumnLabelKeys[column] ? (
                  <TranslatedText labelKey={decisionColumnLabelKeys[column]} />
                ) : (
                  column
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {isCreating && (
            <CreateDecisionRow
              projects={projects}
              projectWorkstreams={projectWorkstreams}
	     decisionStatusOptions={decisionStatusOptions}
              defaultDecisionStatus={defaultDecisionStatus}
              createDecision={createDecision}
              onCancel={() => setIsCreating(false)}
            />
          )}

          {safeDecisions.map((decision) => (
            <DecisionRow
              key={decision.id}
              decision={decision}
              projects={projects}
              projectWorkstreams={projectWorkstreams}
		decisionStatusOptions={decisionStatusOptions}
              updateDecision={updateDecision}
              archiveDecision={archiveDecision}
              deleteDecision={deleteDecision}
            />
          ))}

          {safeDecisions.length === 0 && !isCreating && (
            <TableEmptyRow colSpan={10}>{DECISION_ENTITY.emptyLabel}</TableEmptyRow>
          )}
        </tbody>
      </StandardTable>
    </>
  );
}

function CreateDecisionRow({
  projects,
  projectWorkstreams,
  decisionStatusOptions,
  defaultDecisionStatus,
  createDecision,
  onCancel,
}: CreateDecisionRowProps) {

  const { handleAction } = useActionToast();
  const { t, locale } = useTranslation();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const availableWorkstreams = projectWorkstreams.filter((pw) => pw.projectId === projectId);
  const projectCodeOptions = projects.map((project) => ({
    value: project.id,
    label: project.projectCode,
  }));
  const workstreamOptions = availableWorkstreams.map((pw) => ({
    value: pw.id,
    label: `${pw.workstream.phase.name} / ${pw.workstream.name}`,
  }));
  const statusOptions = decisionStatusOptions.map((option) => ({
    value: option.status.code,
    label:
      getConfiguredOptions([option.status], locale, t, "status")[0]?.label ??
      option.status.name,
  }));
  const impactOptions = getDecisionImpactOptions(t);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleAction(createDecision, new FormData(event.currentTarget), onCancel);
  }

  return (
    <tr>
      <td style={tdStyle} colSpan={10}>
        <form onSubmit={handleCreate} style={{ margin: 0 }}>
          <div
            style={{
              display: "grid",
gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: "0.35rem",
              alignItems: "center",
            }}
          >
            <SelectInput
              name="projectId"
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              options={projectCodeOptions}
            />

            <SelectInput
              name="projectWorkstreamId"
              placeholder="No workstream"
              options={workstreamOptions}
            />

            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
              {DECISION_ENTITY.autoCodeLabel}
            </div>
            <TextInput name="title" required placeholder="Decision title" />

            <SelectInput
              name="status"
              defaultValue={defaultDecisionStatus}
              options={statusOptions}
            />

            <SelectInput
              name="impact"
              defaultValue="MEDIUM"
              options={impactOptions}
            />

            <TextInput name="owner" placeholder="Owner" />
            <DateInput name="dueDate" />

            <input type="checkbox" name="escalated" value="true" />

            <TableActionGroup>
              <button type="submit" style={tableButtonStyle}>
                <TranslatedButtonLabel labelKey="actions.save" />
              </button>
              <button type="button" style={tableButtonStyle} onClick={onCancel}>
                {DECISION_ENTITY.actions.cancel}
              </button>
            </TableActionGroup>
          </div>

          <div
            style={{
              marginTop: "0.5rem",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0.5rem",
              background: "#f8fafc",
              padding: "0.5rem",
              borderRadius: "8px",
            }}
          >
            <TextAreaInput
              name="description"
              placeholder={DECISION_ENTITY.fields.description}
              style={{ minHeight: "42px" }}
            />
            <TextAreaInput
              name="recommendation"
              placeholder={DECISION_ENTITY.fields.recommendation}
              style={{ minHeight: "42px" }}
            />
            <TextAreaInput
              name="notes"
              placeholder={DECISION_ENTITY.fields.notes}
              style={{ minHeight: "42px" }}
            />
          </div>
        </form>
      </td>
    </tr>
  );
}

function DecisionRow({
  decision,
  projects,
  projectWorkstreams,
  decisionStatusOptions,
  updateDecision,
  archiveDecision,
  deleteDecision,
}: DecisionRowProps) {
  const { handleAction } = useActionToast();
  const { t, locale } = useTranslation();

  const [showDetails, setShowDetails] = useState(false);
  const [projectId, setProjectId] = useState(decision.projectId ?? "");
  const [projectWorkstreamId, setProjectWorkstreamId] = useState(decision.projectWorkstreamId ?? "");
  const [decisionCode, setDecisionCode] = useState(decision.decisionCode ?? "");
  const [title, setTitle] = useState(decision.title ?? "");
  const [status, setStatus] = useState(
  decision.statusRef?.code ?? "OPEN"
	);
  const [impact, setImpact] = useState(decision.impact ?? "MEDIUM");
  const [owner, setOwner] = useState(decision.owner ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(decision.dueDate));
  const [decisionDate, setDecisionDate] = useState(toDateInputValue(decision.decisionDate));
  const [escalated, setEscalated] = useState(Boolean(decision.escalated));
  const [visibility, setVisibility] = useState(decision.visibility ?? "EXECUTIVE");

  const [requestedBy, setRequestedBy] = useState(decision.requestedBy ?? "");
  const [description, setDescription] = useState(decision.description ?? "");
  const [recommendation, setRecommendation] = useState(decision.recommendation ?? "");
  const [decisionText, setDecisionText] = useState(decision.decision ?? "");
  const [notes, setNotes] = useState(decision.notes ?? "");

  const availableWorkstreams = projectWorkstreams.filter((pw) => pw.projectId === projectId);
  const projectCodeOptions = projects.map((project) => ({
    value: project.id,
    label: project.projectCode,
  }));
  const workstreamOptions = availableWorkstreams.map((pw) => ({
    value: pw.id,
    label: `${pw.workstream.phase.name} / ${pw.workstream.name}`,
  }));
  const statusOptions = decisionStatusOptions.map((option) => ({
    value: option.status.code,
    label:
      getConfiguredOptions([option.status], locale, t, "status")[0]?.label ??
      option.status.name,
  }));
  const impactOptions = getDecisionImpactOptions(t);
  const visibilityOptions = getVisibilityOptions(t);

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleAction(updateDecision, new FormData(event.currentTarget));
  }

  async function handleArchive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleAction(archiveDecision, new FormData(event.currentTarget));
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleAction(deleteDecision, new FormData(event.currentTarget));
  }

  const canDelete = canDeleteDecisionByStatusCode(status);

  return (
    <>
      <tr id={`decision-${decision.id}`}>
        <td style={tdStyle}>
          <SelectInput
            name="projectId"
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setProjectWorkstreamId("");
            }}
            options={projectCodeOptions}
          />
        </td>

        <td style={tdStyle}>
          <SelectInput
            value={projectWorkstreamId}
            onChange={(e) => setProjectWorkstreamId(e.target.value)}
            placeholder="No workstream"
            options={workstreamOptions}
          />
        </td>

        <td style={tdStyle}>
          <TextInput
            value={decisionCode}
            onChange={(e) => setDecisionCode(e.target.value)}
          />
        </td>

        <td style={tdStyle}>
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
        </td>

        <td style={tdStyle}>
          <SelectInput
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={statusOptions}
          />
        </td>

        <td style={tdStyle}>
          <SelectInput
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            options={impactOptions}
          />
        </td>

        <td style={tdStyle}>
          <TextInput value={owner} onChange={(e) => setOwner(e.target.value)} />
        </td>

        <td style={tdStyle}>
          <DateInput value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </td>

        <td style={tdStyle}>
          <input type="checkbox" checked={escalated} onChange={(e) => setEscalated(e.target.checked)} />
        </td>

        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
          <TableActionGroup>
            <form onSubmit={handleUpdate} style={{ margin: 0 }}>
              <input type="hidden" name="id" value={decision.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="projectWorkstreamId" value={projectWorkstreamId} />
              <input type="hidden" name="decisionCode" value={decisionCode} />
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="status" value={status} />
              <input type="hidden" name="impact" value={impact} />
              <input type="hidden" name="owner" value={owner} />
              <input type="hidden" name="dueDate" value={dueDate} />
              <input type="hidden" name="decisionDate" value={decisionDate} />
              <input type="hidden" name="escalated" value={escalated ? "true" : ""} />
              <input type="hidden" name="visibility" value={visibility} />
              <input type="hidden" name="requestedBy" value={requestedBy} />
              <input type="hidden" name="description" value={description} />
              <input type="hidden" name="recommendation" value={recommendation} />
              <input type="hidden" name="decision" value={decisionText} />
              <input type="hidden" name="notes" value={notes} />

              <button type="submit" style={tableButtonStyle}>
                <TranslatedButtonLabel labelKey="actions.save" />
              </button>
            </form>

            <button type="button" style={tableButtonStyle} onClick={() => setShowDetails(!showDetails)}>
              <TranslatedButtonLabel
                labelKey={showDetails ? "actions.hideDetails" : "actions.details"}
              />
            </button>

            <form onSubmit={handleArchive} style={{ margin: 0 }}>
              <input type="hidden" name="id" value={decision.id} />
              <button type="submit" style={tableButtonStyle}>
                <TranslatedButtonLabel labelKey="actions.archive" />
              </button>
            </form>

            {canDelete && (
              <form onSubmit={handleDelete} style={{ margin: 0 }}>
                <input type="hidden" name="id" value={decision.id} />
                <button type="submit" style={tableButtonStyle}>
                  <TranslatedButtonLabel labelKey="actions.delete" />
                </button>
              </form>
            )}
          </TableActionGroup>
        </td>
      </tr>

      {showDetails && (
        <tr>
          <td style={tdStyle} colSpan={10}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "0.75rem",
                background: "#f8fafc",
                padding: "0.75rem",
                borderRadius: "8px",
              }}
            >
              <DetailField label={<TranslatedText labelKey="labels.requestedBy" />}>
                <TextInput
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  style={{ marginTop: "0.2rem" }}
                />
              </DetailField>

              <DetailField label={<TranslatedText labelKey="labels.decisionDate" />}>
                <DateInput
                  value={decisionDate}
                  onChange={(e) => setDecisionDate(e.target.value)}
                  style={{ marginTop: "0.2rem" }}
                />
              </DetailField>

              <DetailField label={<TranslatedText labelKey="labels.visibility" />}>
                <SelectInput
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  options={visibilityOptions}
                  style={{ marginTop: "0.2rem" }}
                />
              </DetailField>

              <DetailField label={<TranslatedText labelKey="labels.description" />}>
                <TextAreaInput
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ marginTop: "0.2rem" }}
                />
              </DetailField>

              <DetailField label={<TranslatedText labelKey="labels.recommendation" />}>
                <TextAreaInput
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  style={{ marginTop: "0.2rem" }}
                />
              </DetailField>

              <DetailField label={<TranslatedText labelKey="labels.decision" />}>
                <TextAreaInput
                  value={decisionText}
                  onChange={(e) => setDecisionText(e.target.value)}
                  style={{ marginTop: "0.2rem" }}
                />
              </DetailField>

              <div style={{ gridColumn: "1 / -1" }}>
                <DetailField label={<TranslatedText labelKey="labels.notes" />}>
                  <TextAreaInput
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ marginTop: "0.2rem" }}
                  />
                </DetailField>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
