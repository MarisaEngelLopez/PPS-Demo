"use client";

import { useState } from "react";
import { tableButtonStyle } from "@/components/ui/layoutStyles";
import {
  DateInput,
  SelectInput,
  TextAreaInput,
} from "@/components/ui/FormFields";
import {
  StandardTable,
  TableActionGroup,
  TableEmptyRow,
} from "@/components/ui/TablePrimitives";
import { tdStyle, thStyle } from "@/components/ui/tableStyles";
import { AddActionButton } from "@/components/ui/AddActionButton";
import { NestedTablePanel } from "@/components/ui/NestedTablePanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import {
  TranslatedButtonLabel,
  TranslatedText,
} from "@/components/ui/TranslatedControls";
import {
  getExposureStyle,
  RISK_ASSESSMENT_ENTITY,
} from "@/lib/domain/risks/riskContract";
import type { RiskActionResult } from "@/lib/domain/risks/riskTypes";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import {
  getRiskAssessmentTypeOptions,
  getRiskScoreOptions,
} from "@/lib/i18n/displayTranslations";

type RiskCommand = (formData: FormData) => Promise<RiskActionResult | void>;

const riskAssessmentColumnLabelKeys: Record<string, TranslationKey> = {
  Action: "labels.action",
  "Assessed By": "labels.assessedBy",
  Comments: "labels.comments",
  Date: "table.date",
  Exposure: "labels.exposure",
  Impact: "labels.impact",
  Probability: "labels.probability",
  Type: "labels.type",
};

type UserOption = {
  id: string;
  fullName: string;
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

type RiskForAssessments = {
  id: string;
  assessments?: RiskAssessmentRowData[];
};

type RiskAssessmentsTableProps = {
  risk: RiskForAssessments;
  users: UserOption[];
  createRiskAssessment: RiskCommand;
  updateRiskAssessment: RiskCommand;
  deleteRiskAssessment: RiskCommand;
};

type RiskAssessmentRowProps = {
  assessment: RiskAssessmentRowData;
  users: UserOption[];
  updateRiskAssessment: RiskCommand;
  deleteRiskAssessment: RiskCommand;
};

function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function RiskAssessmentsTable({
  risk,
  users,
  createRiskAssessment,
  updateRiskAssessment,
  deleteRiskAssessment,
}: RiskAssessmentsTableProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newProbability, setNewProbability] = useState(3);
  const [newImpact, setNewImpact] = useState(3);
  const { t } = useTranslation();
  const formId = `risk-assessment-create-${risk.id}`;
  const userOptions = users.map((user) => ({
    value: user.id,
    label: user.fullName,
  }));
  const newExposure = newProbability * newImpact;
  const assessmentTypeOptions = getRiskAssessmentTypeOptions(t);
  const riskScoreOptions = getRiskScoreOptions(t);

  async function handleCreate(formData: FormData) {
    await createRiskAssessment(formData);
    setIsCreating(false);
  }

  return (
    <NestedTablePanel>
      <SectionHeader
        title={<TranslatedText labelKey="sections.riskAssessments" />}
        action={
          <AddActionButton type="button" onClick={() => setIsCreating(true)}>
            {RISK_ASSESSMENT_ENTITY.createLabel}
          </AddActionButton>
        }
      />

      <form id={formId} action={handleCreate} />

      <StandardTable style={{ marginTop: "0.5rem" }}>
        <thead>
          <tr>
            {RISK_ASSESSMENT_ENTITY.tableColumns.map((column) => (
              <th key={column} style={thStyle}>
                {riskAssessmentColumnLabelKeys[column] ? (
                  <TranslatedText labelKey={riskAssessmentColumnLabelKeys[column]} />
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
                  name="assessmentType"
                  defaultValue={RISK_ASSESSMENT_ENTITY.defaultAssessmentType}
                  form={formId}
                  options={assessmentTypeOptions}
                />
                <input type="hidden" name="riskId" value={risk.id} form={formId} />
              </td>
              <td style={tdStyle}>
                <SelectInput
                  name="probability"
                  defaultValue={newProbability}
                  onChange={(event) => setNewProbability(Number(event.target.value))}
                  form={formId}
                  options={riskScoreOptions}
                />
              </td>
              <td style={tdStyle}>
                <SelectInput
                  name="impact"
                  defaultValue={newImpact}
                  onChange={(event) => setNewImpact(Number(event.target.value))}
                  form={formId}
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
                    ...getExposureStyle(newExposure),
                  }}
                >
                  {newExposure}
                </span>
              </td>
              <td style={tdStyle}>
                <SelectInput
                  name="assessedByUserId"
                  form={formId}
                  placeholder={RISK_ASSESSMENT_ENTITY.fields.noAssessor}
                  options={userOptions}
                />
              </td>
              <td style={tdStyle}>
                <DateInput
                  name="assessmentDate"
                  form={formId}
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </td>
              <td style={tdStyle}>
                <TextAreaInput
                  name="comments"
                  form={formId}
                  placeholder={RISK_ASSESSMENT_ENTITY.fields.commentsPlaceholder}
                  style={{ minHeight: "34px" }}
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

          {(risk.assessments ?? []).map((assessment) => (
            <RiskAssessmentRow
              key={assessment.id}
              assessment={assessment}
              users={users}
              updateRiskAssessment={updateRiskAssessment}
              deleteRiskAssessment={deleteRiskAssessment}
            />
          ))}

          {(risk.assessments ?? []).length === 0 && !isCreating && (
            <TableEmptyRow colSpan={8}>
              {RISK_ASSESSMENT_ENTITY.emptyLabel}
            </TableEmptyRow>
          )}
        </tbody>
      </StandardTable>
    </NestedTablePanel>
  );
}

function RiskAssessmentRow({
  assessment,
  users,
  updateRiskAssessment,
  deleteRiskAssessment,
}: RiskAssessmentRowProps) {
  const { t } = useTranslation();
  const formId = `risk-assessment-form-${assessment.id}`;
  const [assessmentType, setAssessmentType] = useState(
    assessment.assessmentType
  );
  const [probability, setProbability] = useState(assessment.probability);
  const [impact, setImpact] = useState(assessment.impact);
  const [assessedByUserId, setAssessedByUserId] = useState(
    assessment.assessedByUserId ?? ""
  );
  const [assessmentDate, setAssessmentDate] = useState(
    toDateInputValue(assessment.assessmentDate)
  );
  const [comments, setComments] = useState(assessment.comments ?? "");
  const exposure = probability * impact;
  const userOptions = users.map((user) => ({
    value: user.id,
    label: user.fullName,
  }));
  const assessmentTypeOptions = getRiskAssessmentTypeOptions(t);
  const riskScoreOptions = getRiskScoreOptions(t);

  async function handleUpdate(formData: FormData) {
    await updateRiskAssessment(formData);
  }

  async function handleDelete(formData: FormData) {
    await deleteRiskAssessment(formData);
  }

  return (
    <tr>
      <td style={tdStyle}>
        <SelectInput
          value={assessmentType}
          onChange={(event) =>
            setAssessmentType(event.target.value as "INHERENT" | "RESIDUAL")
          }
          options={assessmentTypeOptions}
        />
      </td>
      <td style={tdStyle}>
        <SelectInput
          value={probability}
          onChange={(event) => setProbability(Number(event.target.value))}
          options={riskScoreOptions}
        />
      </td>
      <td style={tdStyle}>
        <SelectInput
          value={impact}
          onChange={(event) => setImpact(Number(event.target.value))}
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
          value={assessedByUserId}
          onChange={(event) => setAssessedByUserId(event.target.value)}
          placeholder={RISK_ASSESSMENT_ENTITY.fields.noAssessor}
          options={userOptions}
        />
      </td>
      <td style={tdStyle}>
        <DateInput
          value={assessmentDate}
          onChange={(event) => setAssessmentDate(event.target.value)}
        />
      </td>
      <td style={tdStyle}>
        <TextAreaInput
          value={comments}
          onChange={(event) => setComments(event.target.value)}
          style={{ minHeight: "34px" }}
        />
      </td>
      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
        <TableActionGroup>
          <form id={formId} action={handleUpdate} style={{ margin: 0 }}>
            <input type="hidden" name="id" value={assessment.id} />
            <input type="hidden" name="riskId" value={assessment.riskId} />
            <input type="hidden" name="assessmentType" value={assessmentType} />
            <input type="hidden" name="probability" value={probability} />
            <input type="hidden" name="impact" value={impact} />
            <input
              type="hidden"
              name="assessedByUserId"
              value={assessedByUserId}
            />
            <input type="hidden" name="assessmentDate" value={assessmentDate} />
            <input type="hidden" name="comments" value={comments} />
            <button type="submit" style={tableButtonStyle}>
              <TranslatedButtonLabel labelKey="actions.save" />
            </button>
          </form>

          <form action={handleDelete} style={{ margin: 0 }}>
            <input type="hidden" name="id" value={assessment.id} />
            <button type="submit" style={tableButtonStyle}>
              <TranslatedButtonLabel labelKey="actions.delete" />
            </button>
          </form>
        </TableActionGroup>
      </td>
    </tr>
  );
}
