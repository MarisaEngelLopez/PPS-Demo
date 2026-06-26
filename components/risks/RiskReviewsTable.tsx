"use client";

import {
  TranslatedButtonLabel,
  TranslatedText,
} from "@/components/ui/TranslatedControls";
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
import type { RiskActionResult } from "@/lib/domain/risks/riskTypes";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import {
  getConfiguredOptions,
  translateRiskAssessmentType,
} from "@/lib/i18n/displayTranslations";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

type RiskCommand = (formData: FormData) => Promise<RiskActionResult | void>;

type UserOption = {
  id: string;
  fullName: string;
};

type ReviewConfigOption = {
  id: string;
  code: string;
  name: string;
  nameEs?: string | null;
};

type RiskAssessmentOption = {
  id: string;
  assessmentType: "INHERENT" | "RESIDUAL";
  exposure: number;
  assessmentDate: Date | string;
};

type DecisionOption = {
  id: string;
  projectId: string;
  decisionCode: string | null;
  title: string;
  statusRef?: { code?: string | null; name: string; nameEs?: string | null } | null;
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
  reviewType?: { code?: string | null; name: string; nameEs?: string | null } | null;
  reviewOutcome?: { code?: string | null; name: string; nameEs?: string | null } | null;
  reviewedByUser?: { fullName: string } | null;
  decisionLinks: {
    projectDecisionId: string;
    projectDecision: DecisionOption;
  }[];
};

type RiskForReviews = {
  id: string;
  projectId: string;
  assessments?: RiskAssessmentOption[];
  reviews?: RiskReviewRowData[];
};

export function RiskReviewsTable({
  risk,
  users,
  reviewTypes,
  reviewOutcomes,
  projectDecisions,
  createRiskReview,
  updateRiskReview,
  deleteRiskReview,
}: {
  risk: RiskForReviews;
  users: UserOption[];
  reviewTypes: ReviewConfigOption[];
  reviewOutcomes: ReviewConfigOption[];
  projectDecisions: DecisionOption[];
  createRiskReview: RiskCommand;
  updateRiskReview: RiskCommand;
  deleteRiskReview: RiskCommand;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const { t, locale } = useTranslation();
  const formId = `risk-review-create-${risk.id}`;
  const reviewTypeOptions = getConfiguredOptions(
    reviewTypes,
    locale,
    t,
    "riskReviewType"
  );
  const reviewOutcomeOptions = getConfiguredOptions(
    reviewOutcomes,
    locale,
    t,
    "riskReviewOutcome"
  );
  const userOptions = users.map((user) => ({
    value: user.id,
    label: user.fullName,
  }));
  const assessmentOptions = buildAssessmentOptions(risk.assessments ?? [], t);
  const decisionOptions = projectDecisions
    .filter((decision) => decision.projectId === risk.projectId)
    .map(buildDecisionOption);

  async function handleCreate(formData: FormData) {
    await createRiskReview(formData);
    setIsCreating(false);
  }

  return (
    <NestedTablePanel>
      <SectionHeader
        title={<TranslatedText labelKey="sections.riskManagementReviews" />}
        action={
          <AddActionButton
            type="button"
            onClick={() => setIsCreating(true)}
            labelKey="actions.addReview"
          />
        }
      />

      <form id={formId} action={handleCreate} />

      <StandardTable style={{ marginTop: "0.5rem" }}>
        <thead>
          <tr>
            <th style={thStyle}><TranslatedText labelKey="labels.type" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.outcome" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.residualAssessment" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.reviewedBy" /></th>
            <th style={thStyle}><TranslatedText labelKey="table.date" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.linkedDecision" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.comments" /></th>
            <th style={thStyle}><TranslatedText labelKey="labels.action" /></th>
          </tr>
        </thead>
        <tbody>
          {isCreating && (
            <tr>
              <td style={tdStyle}>
                <SelectInput
                  name="reviewTypeId"
                  required
                  form={formId}
                  options={reviewTypeOptions}
                />
                <input type="hidden" name="riskId" value={risk.id} form={formId} />
              </td>
              <td style={tdStyle}>
                <SelectInput
                  name="reviewOutcomeId"
                  required
                  form={formId}
                  options={reviewOutcomeOptions}
                />
              </td>
              <td style={tdStyle}>
                <SelectInput
                  name="residualAssessmentId"
                  form={formId}
                  placeholder="No assessment"
                  options={assessmentOptions}
                />
              </td>
              <td style={tdStyle}>
                <SelectInput
                  name="reviewedByUserId"
                  form={formId}
                  placeholder="No reviewer"
                  options={userOptions}
                />
              </td>
              <td style={tdStyle}>
                <DateInput
                  name="reviewDate"
                  form={formId}
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </td>
              <td style={tdStyle}>
                <SelectInput
                  name="linkedDecisionIds"
                  form={formId}
                  placeholder="No linked decision"
                  options={decisionOptions}
                />
              </td>
              <td style={tdStyle}>
                <TextAreaInput name="comments" form={formId} />
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

          {(risk.reviews ?? []).map((review) => (
            <RiskReviewRow
              key={review.id}
              review={review}
              users={users}
              reviewTypes={reviewTypes}
              reviewOutcomes={reviewOutcomes}
              assessments={risk.assessments ?? []}
              decisions={projectDecisions.filter(
                (decision) => decision.projectId === risk.projectId
              )}
              updateRiskReview={updateRiskReview}
              deleteRiskReview={deleteRiskReview}
            />
          ))}

          {(risk.reviews ?? []).length === 0 && !isCreating && (
            <TableEmptyRow colSpan={8}>No committee reviews yet.</TableEmptyRow>
          )}
        </tbody>
      </StandardTable>
    </NestedTablePanel>
  );
}

function RiskReviewRow({
  review,
  users,
  reviewTypes,
  reviewOutcomes,
  assessments,
  decisions,
  updateRiskReview,
  deleteRiskReview,
}: {
  review: RiskReviewRowData;
  users: UserOption[];
  reviewTypes: ReviewConfigOption[];
  reviewOutcomes: ReviewConfigOption[];
  assessments: RiskAssessmentOption[];
  decisions: DecisionOption[];
  updateRiskReview: RiskCommand;
  deleteRiskReview: RiskCommand;
}) {
  const { t, locale } = useTranslation();
  const formId = `risk-review-form-${review.id}`;
  const [reviewTypeId, setReviewTypeId] = useState(review.reviewTypeId);
  const [reviewOutcomeId, setReviewOutcomeId] = useState(review.reviewOutcomeId);
  const [residualAssessmentId, setResidualAssessmentId] = useState(
    review.residualAssessmentId ?? ""
  );
  const [reviewedByUserId, setReviewedByUserId] = useState(
    review.reviewedByUserId ?? ""
  );
  const [reviewDate, setReviewDate] = useState(toDateInputValue(review.reviewDate));
  const [linkedDecisionId, setLinkedDecisionId] = useState(
    review.decisionLinks[0]?.projectDecisionId ?? ""
  );
  const [comments, setComments] = useState(review.comments ?? "");

  async function handleUpdate(formData: FormData) {
    await updateRiskReview(formData);
  }

  async function handleDelete(formData: FormData) {
    await deleteRiskReview(formData);
  }

  return (
    <tr>
      <td style={tdStyle}>
        <SelectInput
          value={reviewTypeId}
          onChange={(event) => setReviewTypeId(event.target.value)}
          options={getConfiguredOptions(reviewTypes, locale, t, "riskReviewType")}
        />
      </td>
      <td style={tdStyle}>
        <SelectInput
          value={reviewOutcomeId}
          onChange={(event) => setReviewOutcomeId(event.target.value)}
          options={getConfiguredOptions(reviewOutcomes, locale, t, "riskReviewOutcome")}
        />
      </td>
      <td style={tdStyle}>
        <SelectInput
          value={residualAssessmentId}
          onChange={(event) => setResidualAssessmentId(event.target.value)}
          placeholder="No assessment"
          options={buildAssessmentOptions(assessments, t)}
        />
      </td>
      <td style={tdStyle}>
        <SelectInput
          value={reviewedByUserId}
          onChange={(event) => setReviewedByUserId(event.target.value)}
          placeholder="No reviewer"
          options={users.map((user) => ({ value: user.id, label: user.fullName }))}
        />
      </td>
      <td style={tdStyle}>
        <DateInput
          value={reviewDate}
          onChange={(event) => setReviewDate(event.target.value)}
        />
      </td>
      <td style={tdStyle}>
        <SelectInput
          value={linkedDecisionId}
          onChange={(event) => setLinkedDecisionId(event.target.value)}
          placeholder="No linked decision"
          options={decisions.map(buildDecisionOption)}
        />
      </td>
      <td style={tdStyle}>
        <TextAreaInput
          value={comments}
          onChange={(event) => setComments(event.target.value)}
        />
      </td>
      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
        <TableActionGroup>
          <form id={formId} action={handleUpdate} style={{ margin: 0 }}>
            <input type="hidden" name="id" value={review.id} />
            <input type="hidden" name="riskId" value={review.riskId} />
            <input type="hidden" name="reviewTypeId" value={reviewTypeId} />
            <input type="hidden" name="reviewOutcomeId" value={reviewOutcomeId} />
            <input
              type="hidden"
              name="residualAssessmentId"
              value={residualAssessmentId}
            />
            <input
              type="hidden"
              name="reviewedByUserId"
              value={reviewedByUserId}
            />
            <input type="hidden" name="reviewDate" value={reviewDate} />
            <input type="hidden" name="linkedDecisionIds" value={linkedDecisionId} />
            <input type="hidden" name="comments" value={comments} />
            <button type="submit" style={tableButtonStyle}>
              <TranslatedButtonLabel labelKey="actions.save" />
            </button>
          </form>

          <form action={handleDelete} style={{ margin: 0 }}>
            <input type="hidden" name="id" value={review.id} />
            <button type="submit" style={tableButtonStyle}>
              <TranslatedButtonLabel labelKey="actions.delete" />
            </button>
          </form>
        </TableActionGroup>
      </td>
    </tr>
  );
}

function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function buildAssessmentOptions(
  assessments: RiskAssessmentOption[],
  t: (key: TranslationKey) => string
) {
  return assessments.map((assessment) => ({
    value: assessment.id,
    label: `${translateRiskAssessmentType(assessment.assessmentType, t)} / ${t("labels.exposure")} ${
      assessment.exposure
    } / ${toDateInputValue(assessment.assessmentDate)}`,
  }));
}

function buildDecisionOption(decision: DecisionOption) {
  return {
    value: decision.id,
    label: `${decision.decisionCode ?? "Decision"} - ${decision.title}`,
  };
}
