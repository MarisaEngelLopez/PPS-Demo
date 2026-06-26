import { DecisionsTable } from "@/components/decisions/DecisionsTable";
import {
  pageStyle,
  h1Style,
  sectionPanelStyle,
} from "@/components/ui/layoutStyles";
import {
  getDecisionPageData,
  parseDecisionFilters,
} from "@/lib/domain/decisions/decisionQueries";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import {
  createDecision,
  updateDecision,
  archiveDecision,
  deleteDecision,
} from "./actions";

export default async function DecisionsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    projectId?: string;
    status?: string;
    impact?: string;
    owner?: string;
    escalated?: string;
    overdueOnly?: string;
    openOnly?: string;
  }>;
}) {
  const locale = await getServerLocale();
  const resolvedSearchParams = await searchParams;
  const filters = parseDecisionFilters(resolvedSearchParams);
  const {
    projects,
    projectWorkstreams,
    decisionStatusOptions,
    decisions,
    metrics,
  } = await getDecisionPageData(filters);


  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "pages.decisionRegister")}</h1>

      <div style={{ ...sectionPanelStyle, marginBottom: "1rem" }}>
        Governance decisions, steering asks, approvals and executive decision
        tracking across projects.
      </div>

      <DecisionsTable
        projects={projects}
        projectWorkstreams={projectWorkstreams}
   decisions={decisions}
        decisionStatusOptions={decisionStatusOptions}
   filters={filters}
        metrics={metrics}
        createDecision={createDecision}
        updateDecision={updateDecision}
        archiveDecision={archiveDecision}
        deleteDecision={deleteDecision}
      />
    </main>
  );
}
