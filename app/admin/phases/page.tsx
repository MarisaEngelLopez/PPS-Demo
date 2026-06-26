import { PhasesTable } from "@/components/admin/PhasesTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { getPhaseAdminRows } from "@/lib/domain/phases/phaseQueries";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import {
  createPhase,
  updatePhase,
  togglePhase,
  deletePhase,
} from "./actions";

export default async function PhasesPage() {
  const [locale, phases] = await Promise.all([
    getServerLocale(),
    getPhaseAdminRows(),
  ]);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "admin.phases.title")}</h1>

      <PhasesTable
        phases={phases}
        createPhase={createPhase}
        updatePhase={updatePhase}
        togglePhase={togglePhase}
        deletePhase={deletePhase}
      />
    </main>
  );
}
