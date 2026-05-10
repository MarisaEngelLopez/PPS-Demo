import { MainNav } from "@/components/MainNav";
import { PhasesTable } from "@/components/admin/PhasesTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { prisma } from "@/lib/prisma";
import {
  createPhase,
  togglePhase,
  deletePhase,
} from "./actions";

export default async function PhasesPage() {
  const phases = await prisma.phase.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>Phases</h1>

      <PhasesTable
        phases={phases}
        createPhase={createPhase}
        togglePhase={togglePhase}
        deletePhase={deletePhase}
      />
    </main>
  );
}