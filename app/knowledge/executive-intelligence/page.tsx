import { ExecutiveIntelligenceTable } from "@/components/knowledge/ExecutiveIntelligenceTable";
import { h1Style, pageStyle } from "@/components/ui/layoutStyles";
import { getExecutiveIntelligencePageData } from "@/lib/domain/executiveIntelligence/executiveIntelligenceQueries";
import { getServerLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/dictionaries";
import {
  createExecutiveIntelligence,
  deleteExecutiveIntelligence,
  updateExecutiveIntelligence,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function ExecutiveIntelligencePage() {
  const locale = await getServerLocale();
  const data = await getExecutiveIntelligencePageData();

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "executiveIntelligence.title")}</h1>
      <ExecutiveIntelligenceTable
        items={data.items}
        organizations={data.organizations}
        contacts={data.contacts}
        users={data.users}
        createExecutiveIntelligence={createExecutiveIntelligence}
        updateExecutiveIntelligence={updateExecutiveIntelligence}
        deleteExecutiveIntelligence={deleteExecutiveIntelligence}
      />
    </main>
  );
}
