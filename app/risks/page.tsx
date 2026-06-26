import { RisksTable } from "@/components/risks/RisksTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import {
  getRiskPageData,
  parseRiskFilters,
} from "@/lib/domain/risks/riskQueries";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import {
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
} from "./actions";

type RisksPageProps = {
  searchParams?: Promise<{
    projectId?: string;
    statusId?: string;
    ownerId?: string;
    categoryId?: string;
    escalated?: string;
    redOnly?: string;
    openOnly?: string;
  }>;
};

export default async function RisksPage({ searchParams }: RisksPageProps) {
  const locale = await getServerLocale();
  const filters = parseRiskFilters(await searchParams);
  const {
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
    closedRiskStatusCodes,
    openRiskActionStatusCodes,
    closedRiskActionStatusCodes,
    riskMetrics,
  } = await getRiskPageData(filters);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "pages.riskRegister")}</h1>

      <RisksTable
        projects={projects}
        riskFilterProjects={riskFilterProjects}
        projectWorkstreams={projectWorkstreams}
        riskCategories={riskCategories}
        riskStatuses={riskStatuses}
        riskActionStatuses={riskActionStatuses}
        evidenceTypes={evidenceTypes}
        riskReviewTypes={riskReviewTypes}
        riskReviewOutcomes={riskReviewOutcomes}
        projectDecisions={projectDecisions}
        users={users}
        risks={risks}
        filters={filters}
        riskMetrics={riskMetrics}
        lifecycleConfig={{
          closedRiskStatusCodes,
          openRiskActionStatusCodes,
          closedRiskActionStatusCodes,
        }}
        createProjectRisk={createProjectRisk}
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
      />
    </main>
  );
}
