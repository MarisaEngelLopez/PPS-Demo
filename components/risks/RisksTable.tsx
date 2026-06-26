"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import {
  TranslatedButtonLabel,
  TranslatedText,
} from "@/components/ui/TranslatedControls";
import {
  inputStyle,
  tableButtonStyle,
sectionPanelStyle,
sectionActionButtonStyle,
} from "@/components/ui/layoutStyles";
import { useActionToast } from "@/components/ui/useActionToast";
import { StandardTable, TableActionGroup } from "@/components/ui/TablePrimitives";
import { thStyle, tdStyle } from "@/components/ui/tableStyles";
import { RiskActionsTable } from "@/components/risks/RiskActionsTable";
import { RiskAssessmentsTable } from "@/components/risks/RiskAssessmentsTable";
import { RiskReviewsTable } from "@/components/risks/RiskReviewsTable";
import { RiskLifecycleSummaryTable } from "@/components/risks/RiskLifecycleSummaryTable";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { NestedTablePanel } from "@/components/ui/NestedTablePanel";
import {
  SectionHeader,
  SectionHeaderActionButton,
  SectionHeaderActions,
} from "@/components/ui/SectionHeader";
import { CockpitMetricGrid } from "@/components/executive-report/CockpitMetricGrid";
import {
  CheckboxFilterField,
  DateInput,
  DetailField,
  FilterField,
  FilterSelectInput,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/ui/FormFields";
import {
  buildRiskCockpitMetrics,
  canDeleteRiskByLifecycleFacts,
  getExposureStyle,
  RISK_ENTITY,
} from "@/lib/domain/risks/riskContract";
import type { RiskActionResult, RiskFilters, RiskMetrics } from "@/lib/domain/risks/riskTypes";
import type { RiskLifecycleConfig } from "@/lib/domain/risks/riskLifecycle";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import {
  getConfiguredOptions,
  getRiskScoreOptions,
} from "@/lib/i18n/displayTranslations";

type RiskCommand = (formData: FormData) => Promise<RiskActionResult | void>;
type ToastRiskCommand = (
  formData: FormData
) => Promise<RiskActionResult | undefined>;

const riskColumnLabelKeys: Record<string, TranslationKey> = {
  Action: "labels.action",
  Category: "labels.category",
  Code: "labels.code",
  "Esc.": "labels.esc",
  Expo: "labels.expo",
  Impa: "labels.impa",
  Owner: "labels.owner",
  Prob: "labels.prob",
  Project: "labels.project",
  Risk: "labels.title",
  Status: "labels.status",
  Target: "labels.target",
  Workstream: "labels.workstream",
};

function RiskHeader({
  column,
  style,
}: {
  column: string;
  style?: CSSProperties;
}) {
  const labelKey = riskColumnLabelKeys[column];

  return (
    <th style={{ ...thStyle, ...style }}>
      {labelKey ? <TranslatedText labelKey={labelKey} /> : column}
    </th>
  );
}

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
    phase: { name: string };
  };
};

type NamedOption = {
  id: string;
  code?: string | null;
  name: string;
  nameEs?: string | null;
};

type StatusOption = NamedOption & {
  code: string;
};

type EvidenceTypeOption = NamedOption & {
  code: string;
};

type UserOption = {
  id: string;
  fullName: string;
};

type ReviewConfigOption = NamedOption & {
  code: string;
};

type DecisionOption = {
  id: string;
  projectId: string;
  decisionCode: string | null;
  title: string;
  statusRef?: { code?: string | null; name: string; nameEs?: string | null } | null;
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
  evidenceType?: { code: string; name: string } | null;
};

type RiskActionRowData = {
  id: string;
  actionCode: string | null;
  description: string;
  completionCriteria: string | null;
  ownerId: string | null;
  dueDate: Date | string | null;
  statusRef?: { code: string; name: string } | null;
  evidence: string | null;
  evidenceRecords: RiskActionEvidenceRowData[];
};

type RiskAssessmentRowData = {
  id: string;
  riskId: string;
  assessmentType: "INHERENT" | "RESIDUAL";
  probability: number;
  impact: number;
  exposure: number;
  comments: string | null;
  assessedByUserId: string | null;
  assessmentDate: Date | string;
  assessedByUser?: { fullName: string } | null;
};

type RiskReviewRowData = {
  id: string;
  riskId: string;
  residualAssessmentId: string | null;
  reviewTypeId: string;
  reviewOutcomeId: string;
  reviewedByUserId: string | null;
  reviewDate: Date | string;
  comments: string | null;
  reviewType?: { name: string } | null;
  reviewOutcome?: {
    name: string;
    isClosed?: boolean;
    isPending?: boolean;
  } | null;
  reviewedByUser?: { fullName: string } | null;
  decisionLinks: {
    projectDecisionId: string;
    projectDecision: DecisionOption;
  }[];
};

type RiskRowData = {
  id: string;
  projectId: string;
  project?: { projectCode: string; name: string } | null;
  projectWorkstreamId: string | null;
  riskCode: string | null;
  title: string;
  categoryId: string;
  category?: { code?: string | null; name: string; nameEs?: string | null } | null;
  statusId: string;
  status?: { code: string; name: string; nameEs?: string | null } | null;
  ownerId: string | null;
  owner?: { fullName: string } | null;
  probability: number;
  impact: number;
  exposure: number;
  targetResolutionDate: Date | string | null;
  escalated: boolean;
  description: string | null;
  trigger: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  riskActions: RiskActionRowData[];
  assessments: RiskAssessmentRowData[];
  reviews: RiskReviewRowData[];
};

type RisksTableProps = {
  projects: ProjectOption[];
  riskFilterProjects: ProjectOption[];
  projectWorkstreams: ProjectWorkstreamOption[];
  riskCategories: NamedOption[];
  riskStatuses: StatusOption[];
  riskActionStatuses: StatusOption[];
  evidenceTypes: EvidenceTypeOption[];
  riskReviewTypes: ReviewConfigOption[];
  riskReviewOutcomes: ReviewConfigOption[];
  projectDecisions: DecisionOption[];
  users: UserOption[];
  risks: RiskRowData[];
  filters: RiskFilters;
  riskMetrics: RiskMetrics;
  lifecycleConfig: RiskLifecycleConfig;
  createProjectRisk: RiskCommand;
  updateProjectRisk: RiskCommand;
  deleteProjectRisk: RiskCommand;
  createProjectRiskAction: RiskCommand;
  updateProjectRiskAction: RiskCommand;
  deleteProjectRiskAction: RiskCommand;
  createRiskActionEvidence: RiskCommand;
  updateRiskActionEvidence: RiskCommand;
  deleteRiskActionEvidence: RiskCommand;
  createRiskAssessment: RiskCommand;
  updateRiskAssessment: RiskCommand;
  deleteRiskAssessment: RiskCommand;
  createRiskReview: RiskCommand;
  updateRiskReview: RiskCommand;
  deleteRiskReview: RiskCommand;
};

type RiskRowProps = {
  risk: RiskRowData;
  projects: ProjectOption[];
  projectWorkstreams: ProjectWorkstreamOption[];
  riskCategories: NamedOption[];
  riskStatuses: StatusOption[];
  riskActionStatuses: StatusOption[];
  evidenceTypes: EvidenceTypeOption[];
  riskReviewTypes: ReviewConfigOption[];
  riskReviewOutcomes: ReviewConfigOption[];
  projectDecisions: DecisionOption[];
  users: UserOption[];
  updateProjectRisk: RiskCommand;
  deleteProjectRisk: RiskCommand;
  createProjectRiskAction: RiskCommand;
  updateProjectRiskAction: RiskCommand;
  deleteProjectRiskAction: RiskCommand;
  createRiskActionEvidence: RiskCommand;
  updateRiskActionEvidence: RiskCommand;
  deleteRiskActionEvidence: RiskCommand;
  createRiskAssessment: RiskCommand;
  updateRiskAssessment: RiskCommand;
  deleteRiskAssessment: RiskCommand;
  createRiskReview: RiskCommand;
  updateRiskReview: RiskCommand;
  deleteRiskReview: RiskCommand;
  hideProjectColumn: boolean;
  showActions: boolean;
  onToggleActions: () => void;
};

export function RisksTable({
  projects,
 riskFilterProjects,
  projectWorkstreams,
  riskCategories,
  riskStatuses,
 riskActionStatuses,
 evidenceTypes,
 riskReviewTypes,
 riskReviewOutcomes,
 projectDecisions,
  users,
  risks,
filters,
 riskMetrics,
 lifecycleConfig,
  createProjectRisk,
  updateProjectRisk,
  deleteProjectRisk,
createProjectRiskAction,
updateProjectRiskAction,
deleteProjectRiskAction,
createRiskActionEvidence,
updateRiskActionEvidence,
deleteRiskActionEvidence,
createRiskAssessment,
updateRiskAssessment,
deleteRiskAssessment,
createRiskReview,
updateRiskReview,
deleteRiskReview,

}: RisksTableProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [expandedRiskIds, setExpandedRiskIds] = useState<string[]>([]);

const hideProjectColumn = !!filters?.projectId;
const filterProjects =
  riskFilterProjects?.length > 0 ? riskFilterProjects : projects;
const [newProjectId, setNewProjectId] = useState(filters?.projectId ?? "");
const availableNewProjectWorkstreams = projectWorkstreams.filter(
  (pw) => pw.projectId === newProjectId
);

const [newProbability, setNewProbability] = useState(3);
const [newImpact, setNewImpact] = useState(3);
const { t, locale } = useTranslation();
const riskScoreOptions = getRiskScoreOptions(t);


const newExposure = newProbability * newImpact;
const projectFilterOptions = filterProjects.map((project) => ({
  value: project.id,
  label: `${project.projectCode} - ${project.name}`,
}));
const statusFilterOptions = getConfiguredOptions(riskStatuses, locale, t, "status");
const categoryFilterOptions = getConfiguredOptions(
  riskCategories,
  locale,
  t,
  "riskCategory"
);
const ownerFilterOptions = users.map((user) => ({
  value: user.id,
  label: user.fullName,
}));
const createProjectOptions = projects.map((project) => ({
  value: project.id,
  label: `${project.projectCode} - ${project.name}`,
}));
const createWorkstreamOptions = availableNewProjectWorkstreams.map((pw) => ({
  value: pw.id,
  label: `${pw.workstream.phase.name} / ${pw.workstream.name}`,
}));
const categoryOptions = getConfiguredOptions(riskCategories, locale, t, "riskCategory");
const statusOptions = getConfiguredOptions(riskStatuses, locale, t, "status");
const ownerOptions = users.map((user) => ({
  value: user.id,
  label: user.fullName,
}));
const risksWithActions = risks.filter((risk) => (risk.riskActions ?? []).length > 0);
const allActionPanelsExpanded =
  risksWithActions.length > 0 &&
  risksWithActions.every((risk) => expandedRiskIds.includes(risk.id));

async function handleCreateRisk(formData: FormData) {
  await createProjectRisk(formData);
  setIsCreating(false);
}

function expandRisksWithActions() {
  setExpandedRiskIds(risksWithActions.map((risk) => risk.id));
}

function collapseRiskActions() {
  setExpandedRiskIds([]);
}

function toggleRiskActions(riskId: string) {
  setExpandedRiskIds((current) =>
    current.includes(riskId)
      ? current.filter((id) => id !== riskId)
      : [...current, riskId]
  );
}

useEffect(() => {
  function expandRiskActionFromHash() {
    const hash = window.location.hash;
    if (!hash.startsWith("#risk-action-")) return;

    const actionId = hash.replace("#risk-action-", "");
    const parentRisk = risks.find((risk) =>
      risk.riskActions.some((action) => action.id === actionId)
    );
    if (!parentRisk) return;

    setExpandedRiskIds((current) =>
      current.includes(parentRisk.id) ? current : [...current, parentRisk.id]
    );

    window.setTimeout(() => {
      document
        .getElementById(`risk-action-${actionId}`)
        ?.scrollIntoView({ block: "center" });
    }, 0);
  }

  expandRiskActionFromHash();
  window.addEventListener("hashchange", expandRiskActionFromHash);
  return () => window.removeEventListener("hashchange", expandRiskActionFromHash);
}, [risks]);

   return (
    <>
<CockpitMetricGrid metrics={buildRiskCockpitMetrics(riskMetrics)} />
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
    options={projectFilterOptions}
  />
</FilterField>

        <FilterField label={<TranslatedText labelKey="labels.status" />}>
          <FilterSelectInput
            name="statusId"
            defaultValue={filters?.statusId ?? ""}
            placeholder={t("filters.allStatuses")}
            options={statusFilterOptions}
          />
        </FilterField>

        <FilterField label={<TranslatedText labelKey="labels.category" />}>
          <FilterSelectInput
            name="categoryId"
            defaultValue={filters?.categoryId ?? ""}
            placeholder={t("filters.allCategories")}
            options={categoryFilterOptions}
          />
        </FilterField>

        <FilterField label={<TranslatedText labelKey="labels.owner" />}>
          <FilterSelectInput
            name="ownerId"
            defaultValue={filters?.ownerId ?? ""}
            placeholder={t("filters.allOwners")}
            options={ownerFilterOptions}
          />
        </FilterField>

        <CheckboxFilterField
          name="escalated"
          label={<TranslatedText labelKey="filters.escalatedOnly" />}
          defaultChecked={filters?.escalated}
        />

        <CheckboxFilterField
          name="redOnly"
          label={<TranslatedText labelKey="filters.redOnly" />}
          defaultChecked={filters?.redOnly}
        />

        <CheckboxFilterField
          name="openOnly"
          label={<TranslatedText labelKey="filters.openOnly" />}
          defaultChecked={filters?.openOnly}
        />

        <div
  style={{
    marginLeft: "auto",
    display: "flex",
    gap: "0.35rem",
    alignItems: "end",
  }}
>
  <button type="submit" style={sectionActionButtonStyle}>
    <TranslatedText labelKey="filters.apply" />
  </button>

  <a
    href={RISK_ENTITY.route}
    style={{
      ...sectionActionButtonStyle,
      textDecoration: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <TranslatedText labelKey="filters.clear" />
  </a>
</div>
      </form>

<RiskLifecycleSummaryTable
  risks={risks}
  users={users}
  riskCategories={riskCategories}
  lifecycleConfig={lifecycleConfig}
/>


     <SectionHeader
       title={<TranslatedText labelKey="sections.riskList" />}
       action={
         <SectionHeaderActions>
           <SectionHeaderActionButton
             onClick={expandRisksWithActions}
             inactive={allActionPanelsExpanded || risksWithActions.length === 0}
             labelKey="actions.expandActions"
           />
           <SectionHeaderActionButton
             onClick={collapseRiskActions}
             inactive={!allActionPanelsExpanded}
             labelKey="actions.collapseActions"
           />
           <AddActionButton type="button" onClick={() => setIsCreating(true)}>
             {RISK_ENTITY.createLabel}
           </AddActionButton>
         </SectionHeaderActions>
       }
     />

      <StandardTable>
        <thead>
          <tr>
            {!hideProjectColumn && <RiskHeader column={RISK_ENTITY.tableColumns.project} />}
            <RiskHeader column={RISK_ENTITY.tableColumns.code} />
            <RiskHeader column={RISK_ENTITY.tableColumns.workstream} />
            <RiskHeader column={RISK_ENTITY.tableColumns.title} />
            <RiskHeader column={RISK_ENTITY.tableColumns.category} />
            <RiskHeader column={RISK_ENTITY.tableColumns.probability} style={{ width: "50px" }} />
            <RiskHeader column={RISK_ENTITY.tableColumns.impact} style={{ width: "50px" }} />
      <RiskHeader column={RISK_ENTITY.tableColumns.exposure} style={{ width: "50px" }} />
            <RiskHeader column={RISK_ENTITY.tableColumns.status} style={{ width: "60px" }} />
            <RiskHeader column={RISK_ENTITY.tableColumns.owner} style={{ width: "60px" }} />
            <RiskHeader column={RISK_ENTITY.tableColumns.target} style={{ width: "80px" }} />
            <RiskHeader column={RISK_ENTITY.tableColumns.escalated} />
            <RiskHeader column={RISK_ENTITY.tableColumns.action} />
          </tr>
        </thead>

        <tbody>

{isCreating && (
  <tr>
    <td colSpan={hideProjectColumn ? 13 : 14}>
      <form action={handleCreateRisk} style={{ margin: 0 }}>
        <table style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td style={tdStyle}>{RISK_ENTITY.autoCodeLabel}</td>

              <td style={tdStyle}>
                <SelectInput
                  name="projectId"
                  required
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  placeholder={RISK_ENTITY.fields.projectPlaceholder}
                  options={createProjectOptions}
                />
              </td>

              <td style={tdStyle}>
                <SelectInput
                  name="projectWorkstreamId"
                  placeholder={RISK_ENTITY.fields.noWorkstream}
                  options={createWorkstreamOptions}
                />
              </td>

              <td style={tdStyle}>
                <TextInput
                  name="title"
                  required
                  placeholder={RISK_ENTITY.fields.titlePlaceholder}
                />
              </td>

              <td style={tdStyle}>
                <SelectInput
                  name="categoryId"
                  required
                  options={categoryOptions}
                />
              </td>

              <td style={tdStyle}>
                <SelectInput
                  name="probability"
                  defaultValue={3}
                  onChange={(e) =>
                    setNewProbability(Number(e.target.value))
                  }
                  style={{ ...inputStyle, width: "45px", marginTop: 0 }}
                  options={riskScoreOptions}
                />
              </td>

              <td style={tdStyle}>
                <SelectInput
                  name="impact"
                  defaultValue={3}
                  onChange={(e) =>
                    setNewImpact(Number(e.target.value))
                  }
                  style={{ ...inputStyle, width: "45px", marginTop: 0 }}
                  options={riskScoreOptions}
                />
              </td>

              <td style={tdStyle}>
                <span
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "6px",
                    fontWeight: 600,
                    ...getExposureStyle(newExposure),
                  }}
                >
                  {newExposure}
                </span>
              </td>

              <td style={tdStyle}>
                <SelectInput
                  name="statusId"
                  required
                  options={statusOptions}
                />
              </td>

              <td style={tdStyle}>
                <SelectInput
                  name="ownerId"
                  placeholder={RISK_ENTITY.fields.noOwner}
                  options={ownerOptions}
                />
              </td>

              <td style={tdStyle}>
                <DateInput
                  name="targetResolutionDate"
                />
              </td>

              <td style={tdStyle}>
                <input
                  type="checkbox"
                  name="escalated"
                  value="true"
                />
              </td>

              <td style={tdStyle}>
                <button type="submit" style={tableButtonStyle}>
                  <TranslatedButtonLabel labelKey="actions.save" />
                </button>

                <button
                  type="button"
                  style={tableButtonStyle}
                  onClick={() => setIsCreating(false)}
                >
                  <TranslatedButtonLabel labelKey="actions.cancel" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </form>
    </td>
  </tr>
)}


          {risks.map((risk) => (
            <RiskRow
              key={risk.id}
              risk={risk}
              projects={projects}
              projectWorkstreams={projectWorkstreams}
              riskCategories={riskCategories}
              riskStatuses={riskStatuses}
riskActionStatuses={riskActionStatuses}
evidenceTypes={evidenceTypes}
riskReviewTypes={riskReviewTypes}
riskReviewOutcomes={riskReviewOutcomes}
projectDecisions={projectDecisions}
              users={users}
              updateProjectRisk={updateProjectRisk}
              deleteProjectRisk={deleteProjectRisk}
 createProjectRiskAction={createProjectRiskAction}
  updateProjectRiskAction={updateProjectRiskAction}
  deleteProjectRiskAction={deleteProjectRiskAction}
  createRiskActionEvidence={createRiskActionEvidence}
  updateRiskActionEvidence={updateRiskActionEvidence}
  deleteRiskActionEvidence={deleteRiskActionEvidence}
  createRiskAssessment={createRiskAssessment}
  updateRiskAssessment={updateRiskAssessment}
  deleteRiskAssessment={deleteRiskAssessment}
  createRiskReview={createRiskReview}
  updateRiskReview={updateRiskReview}
  deleteRiskReview={deleteRiskReview}
hideProjectColumn={hideProjectColumn}
showActions={expandedRiskIds.includes(risk.id)}
onToggleActions={() => toggleRiskActions(risk.id)}
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

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function RiskRow({
  risk,
  projects,
  projectWorkstreams,
  riskCategories,
  riskStatuses,
riskActionStatuses,
evidenceTypes,
riskReviewTypes,
riskReviewOutcomes,
projectDecisions,
  users,
  updateProjectRisk,
  deleteProjectRisk,
createProjectRiskAction,
updateProjectRiskAction,
deleteProjectRiskAction,
createRiskActionEvidence,
updateRiskActionEvidence,
deleteRiskActionEvidence,
createRiskAssessment,
updateRiskAssessment,
deleteRiskAssessment,
createRiskReview,
updateRiskReview,
deleteRiskReview,
hideProjectColumn,
showActions,
onToggleActions,
}: RiskRowProps) {
  const formId = `risk-form-${risk.id}`;
  const { handleAction } = useActionToast();
  const { t, locale } = useTranslation();

  const [showDetails, setShowDetails] = useState(false);
  const [showAssessments, setShowAssessments] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  const [projectId, setProjectId] = useState(risk.projectId ?? "");
  const [projectWorkstreamId, setProjectWorkstreamId] = useState(
    risk.projectWorkstreamId ?? ""
  );
  const [title, setTitle] = useState(risk.title ?? "");
  const [categoryId, setCategoryId] = useState(risk.categoryId ?? "");
  const [statusId, setStatusId] = useState(risk.statusId ?? "");
  const [ownerId, setOwnerId] = useState(risk.ownerId ?? "");
  const [probability, setProbability] = useState(risk.probability ?? 3);
  const [impact, setImpact] = useState(risk.impact ?? 3);
  const [targetResolutionDate, setTargetResolutionDate] = useState(
    toDateInputValue(risk.targetResolutionDate)
  );
  const [escalated, setEscalated] = useState(Boolean(risk.escalated));


  const [description, setDescription] = useState(risk.description ?? "");
  const [trigger, setTrigger] = useState(risk.trigger ?? "");


  const exposure = probability * impact;
const actionCount = risk.riskActions?.length ?? 0;

const availableProjectWorkstreams = projectWorkstreams.filter(
  (pw) => pw.projectId === projectId
);

const projectCodeOptions = projects.map((project) => ({
  value: project.id,
  label: project.projectCode,
}));
const workstreamOptions = availableProjectWorkstreams.map((pw) => ({
  value: pw.id,
  label: `${pw.workstream.phase.name} / ${pw.workstream.name}`,
}));
const categoryOptions = getConfiguredOptions(riskCategories, locale, t, "riskCategory");
const statusOptions = getConfiguredOptions(riskStatuses, locale, t, "status");
const ownerOptions = users.map((user) => ({
  value: user.id,
  label: user.fullName,
}));
const riskScoreOptions = getRiskScoreOptions(t);

const assessmentCount = risk.assessments?.length ?? 0;
const reviewCount = risk.reviews?.length ?? 0;
const canDelete = canDeleteRiskByLifecycleFacts({
  statusCode: risk.status?.code,
  actionCount,
  assessmentCount,
  reviewCount,
});

async function handleUpdateRisk(formData: FormData) {
  await handleAction(updateProjectRisk as ToastRiskCommand, formData);
}

async function handleDeleteRisk(formData: FormData) {
  await handleAction(deleteProjectRisk as ToastRiskCommand, formData);
}

const areRiskChildrenExpanded = showActions && showAssessments && showReviews;

function toggleRiskChildren() {
  if (areRiskChildrenExpanded) {
    if (showActions) onToggleActions();
    setShowAssessments(false);
    setShowReviews(false);
    return;
  }

  if (!showActions) onToggleActions();
  setShowAssessments(true);
  setShowReviews(true);
}

  return (
    <>
      <tr id={`risk-${risk.id}`}>
{!hideProjectColumn && (
  <td style={{ ...tdStyle, width: "70px", maxWidth: "70px" }}>
          <SelectInput
            value={projectId}
            onChange={(e) => {
  setProjectId(e.target.value);
  setProjectWorkstreamId("");
}}
             style={{ ...inputStyle, width: "65px", textAlign: "left" }}
            options={projectCodeOptions}
          />
        </td>
)}

        <td style={tdStyle}>{risk.riskCode ?? "-"}</td>

        <td style={{ ...tdStyle, width: "190px", maxWidth: "190px" }}>
          <SelectInput
            value={projectWorkstreamId}
            onChange={(e) => setProjectWorkstreamId(e.target.value)}
            style={{ ...inputStyle, width: "180px", textAlign: "left" }}
            placeholder={RISK_ENTITY.fields.noWorkstream}
            options={workstreamOptions}
          />
        </td>

        <td style={{ ...tdStyle, width: "300px", minWidth: "300px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            {actionCount > 0 ? (
              <span
                title={`${actionCount} mitigation action${actionCount === 1 ? "" : "s"}`}
                style={{
                  minWidth: "18px",
                  height: "18px",
                  borderRadius: "999px",
                  border: "1px solid #bfdbfe",
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {actionCount}
              </span>
            ) : null}
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ ...inputStyle, width: "260px", textAlign: "left" }}
            />
          </div>
        </td>

        <td style={{ ...tdStyle, width: "110px", maxWidth: "110px", textAlign: "left" }}>
          <SelectInput
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
           style={{ ...inputStyle, marginTop: 0, textAlign: "left" }}
            options={categoryOptions}
          />
        </td>

        <td style={tdStyle}>
          <SelectInput
            value={probability}
            onChange={(e) => setProbability(Number(e.target.value))}
            style={{ ...inputStyle, width: "45px", marginTop: 0 }}
            options={riskScoreOptions}
          />
        </td>

        <td style={tdStyle}>
          <SelectInput
            value={impact}
            onChange={(e) => setImpact(Number(e.target.value))}
            style={{ ...inputStyle, width: "45px", marginTop: 0 }}
            options={riskScoreOptions}
          />
        </td>

        <td style={tdStyle}>
          <span
            style={{
  display: "inline-block",
  minWidth: "32px",
  textAlign: "center",
  padding: "0.2rem 0.35rem",
  borderRadius: "6px",
  fontWeight: 600,
  ...getExposureStyle(exposure),
}}
          >
            {exposure}
          </span>
        </td>

        <td style={tdStyle}>
          <SelectInput
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
    style={{ ...inputStyle, width: "55px", marginTop: 0, textAlign: "left" }}
            options={statusOptions}
          />
        </td>

        <td style={tdStyle}>
          <SelectInput
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
           style={{ ...inputStyle, width: "55px", marginTop: 0, textAlign: "left" }}
            placeholder={RISK_ENTITY.fields.noOwner}
            options={ownerOptions}
          />
        </td>

        <td style={tdStyle}>
          <DateInput
            value={targetResolutionDate}
            onChange={(e) => setTargetResolutionDate(e.target.value)}
            style={{ ...inputStyle, width: "87px", marginTop: 0 }}
          />
        </td>

        <td style={tdStyle}>
          <input
            type="checkbox"
            checked={escalated}
            onChange={(e) => setEscalated(e.target.checked)}
          />
        </td>

        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
  <TableActionGroup>
    <form id={formId} action={handleUpdateRisk} style={{ margin: 0 }}>
      <input type="hidden" name="id" value={risk.id} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="projectWorkstreamId" value={projectWorkstreamId} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="statusId" value={statusId} />
      <input type="hidden" name="ownerId" value={ownerId} />
      <input type="hidden" name="probability" value={probability} />
      <input type="hidden" name="impact" value={impact} />
      <input type="hidden" name="targetResolutionDate" value={targetResolutionDate} />
      <input type="hidden" name="escalated" value={escalated ? "true" : ""} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="trigger" value={trigger} />


      <button type="submit" style={tableButtonStyle}>
        <TranslatedButtonLabel labelKey="actions.save" />
      </button>
    </form>

    <button
      type="button"
      style={tableButtonStyle}
      onClick={() => setShowDetails(!showDetails)}
    >
      <TranslatedButtonLabel
        labelKey={showDetails ? "actions.hideDetails" : "actions.details"}
      />
    </button>

    <button
      type="button"
      style={tableButtonStyle}
      onClick={toggleRiskChildren}
    >
      <TranslatedButtonLabel
        labelKey={areRiskChildrenExpanded ? "actions.collapseAll" : "actions.expandAll"}
      />
    </button>

    <button
      type="button"
      style={tableButtonStyle}
      onClick={onToggleActions}
    >
      <TranslatedButtonLabel
        labelKey={showActions ? "actions.hideActions" : "actions.expandActions"}
      />
      {actionCount > 0 ? ` ${actionCount}` : ""}
    </button>

    <button
      type="button"
      style={tableButtonStyle}
      onClick={() => setShowAssessments(!showAssessments)}
    >
      <TranslatedButtonLabel
        labelKey={showAssessments ? "actions.hideAssessments" : "actions.assessments"}
      />
      {assessmentCount > 0 ? ` ${assessmentCount}` : ""}
    </button>

    <button
      type="button"
      style={tableButtonStyle}
      onClick={() => setShowReviews(!showReviews)}
    >
      <TranslatedButtonLabel
        labelKey={showReviews ? "actions.hideReviews" : "actions.reviews"}
      />
      {reviewCount > 0 ? ` ${reviewCount}` : ""}
    </button>

    {canDelete && (
      <form action={handleDeleteRisk} style={{ margin: 0 }}>
        <input type="hidden" name="id" value={risk.id} />
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
          <td style={tdStyle} colSpan={hideProjectColumn ? 12 : 13}>
            <NestedTablePanel>
            <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr 240px",
    gap: "0.75rem",
    alignItems: "stretch",
  }}
>
  <DetailField label={<TranslatedText labelKey="labels.description" />}>
    <TextAreaInput
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      style={{ minHeight: "36px", marginTop: "0.2rem" }}
    />
  </DetailField>

<DetailField label={<TranslatedText labelKey="labels.trigger" />}>
  <TextAreaInput
    value={trigger}
    onChange={(e) => setTrigger(e.target.value)}
    style={{ minHeight: "36px", marginTop: "0.2rem" }}
  />
</DetailField>

  <div
    style={{
      fontSize: "0.75rem",
      color: "#475569",
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
      justifyContent: "center",
    }}
  >
    <div>
      <strong>{RISK_ENTITY.fields.created}</strong> {formatDateTime(risk.createdAt)}
    </div>
    <div>
      <strong>{RISK_ENTITY.fields.updated}</strong> {formatDateTime(risk.updatedAt)}
    </div>
  </div>
            </div>
            </NestedTablePanel>
          </td>
        </tr>
      )}

{showActions && (
  <tr>
    <td style={tdStyle} colSpan={hideProjectColumn ? 12 : 13}>
      <RiskActionsTable
        risk={risk}
        users={users}
riskActionStatuses={riskActionStatuses}
evidenceTypes={evidenceTypes}
        createProjectRiskAction={createProjectRiskAction}
        updateProjectRiskAction={updateProjectRiskAction}
        deleteProjectRiskAction={deleteProjectRiskAction}
        createRiskActionEvidence={createRiskActionEvidence}
        updateRiskActionEvidence={updateRiskActionEvidence}
        deleteRiskActionEvidence={deleteRiskActionEvidence}
      />
    </td>
  </tr>
)}

{showAssessments && (
  <tr>
    <td style={tdStyle} colSpan={hideProjectColumn ? 12 : 13}>
      <RiskAssessmentsTable
        risk={risk}
        users={users}
        createRiskAssessment={createRiskAssessment}
        updateRiskAssessment={updateRiskAssessment}
        deleteRiskAssessment={deleteRiskAssessment}
      />
    </td>
  </tr>
)}

{showReviews && (
  <tr>
    <td style={tdStyle} colSpan={hideProjectColumn ? 12 : 13}>
      <RiskReviewsTable
        risk={risk}
        users={users}
        reviewTypes={riskReviewTypes}
        reviewOutcomes={riskReviewOutcomes}
        projectDecisions={projectDecisions}
        createRiskReview={createRiskReview}
        updateRiskReview={updateRiskReview}
        deleteRiskReview={deleteRiskReview}
      />
    </td>
  </tr>
)}
    </>
  );
}
